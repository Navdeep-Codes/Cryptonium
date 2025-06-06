const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    address: { type: String, required: true, unique: true },
    privateKey: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const UserModel = mongoose.model('User', userSchema);

class AuthManager {
    constructor(config) {
        this.config = config;
    }
    
    async registerUser(username, password, address, privateKey) {
        try {
            const existingUser = await UserModel.findOne({ username });
            if (existingUser) {
                return { success: false, message: 'Username already exists' };
            }
            
            const hashedPassword = await bcrypt.hash(password, 10);
            
            const user = new UserModel({
                username,
                password: hashedPassword,
                address,
                privateKey: this.encryptPrivateKey(privateKey), 
                isAdmin: false
            });
            
            await user.save();
            
            return { 
                success: true, 
                user: {
                    username,
                    address,
                    isAdmin: false
                }
            };
        } catch (error) {
            console.error('Failed to register user:', error);
            return { success: false, message: 'Failed to register user' };
        }
    }
    
    async authenticateUser(username, password) {
        try {
            const user = await UserModel.findOne({ username });
            if (!user) {
                return { success: false, message: 'User not found' };
            }
            
            const isValid = await bcrypt.compare(password, user.password);
            if (!isValid) {
                return { success: false, message: 'Invalid password' };
            }
            
            const token = this.generateToken(user);
            
            return { 
                success: true, 
                token,
                user: {
                    username: user.username,
                    address: user.address,
                    isAdmin: user.isAdmin
                }
            };
        } catch (error) {
            console.error('Authentication error:', error);
            return { success: false, message: 'Authentication failed' };
        }
    }
    
    generateToken(user) {
        return jwt.sign(
            { 
                id: user._id,
                username: user.username,
                address: user.address,
                isAdmin: user.isAdmin
            },
            this.config.JWT_SECRET,
            { expiresIn: '24h' }
        );
    }
    
    verifyToken(token) {
        try {
            return jwt.verify(token, this.config.JWT_SECRET);
        } catch (error) {
            return null;
        }
    }
    
    encryptPrivateKey(privateKey) {
        return `encrypted:${privateKey}`;
    }
    
    decryptPrivateKey(encryptedKey) {
        return encryptedKey.replace('encrypted:', '');
    }

    authMiddleware(req, res, next) {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ error: 'Authentication token required' });
            }
            
            const token = authHeader.split(' ')[1];
            const decoded = this.verifyToken(token);
            
            if (!decoded) {
                return res.status(401).json({ error: 'Invalid token' });
            }
            
            req.user = decoded;
            next();
        } catch (error) {
            console.error('Auth middleware error:', error);
            res.status(401).json({ error: 'Authentication failed' });
        }
    }
    
    adminMiddleware(req, res, next) {
        if (!req.user || !req.user.isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        next();
    }
    
    async getUserByAddress(address) {
        try {
            return await UserModel.findOne({ address });
        } catch (error) {
            console.error('Error finding user by address:', error);
            return null;
        }
    }
}

module.exports = { AuthManager, UserModel };