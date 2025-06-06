
document.addEventListener('DOMContentLoaded', () => {
    if (!auth.isLoggedIn() && !window.location.pathname.includes('index.html')) {
        window.location.href = 'index.html';
        return;
    }
    
    ui.updateUserMenu();
    setupLogoutButton();
    
    const pagePath = window.location.pathname;
    
    if (pagePath.includes('dashboard.html')) {
        initDashboard();
    } else if (pagePath.includes('wallet.html')) {
        initWallet();
    } else if (pagePath.includes('explorer.html')) {
        initExplorer();
    }
});

function setupLogoutButton() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            auth.logout();
        });
    }
}


function initAuthForms() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;
            
            try {
                await auth.login(username, password);
                window.location.href = 'dashboard.html';
            } catch (error) {
                ui.showMessage('login-message', `Login failed: ${error.message}`, 'error');
            }
        });
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('register-username').value;
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-password-confirm').value;
            
            try {
                await auth.register(username, password, confirmPassword);
                ui.showMessage('register-message', 'Registration successful! You can now log in.', 'success');
                
                if (document.getElementById('login-username')) {
                    document.getElementById('login-username').value = username;
                }
                
                const loginTab = document.querySelector('.tab[data-tab="login"]');
                if (loginTab) {
                    loginTab.click();
                }
            } catch (error) {
                ui.showMessage('register-message', `Registration failed: ${error.message}`, 'error');
            }
        });
    }
}


async function initDashboard() {
    try {
        const blockchainInfo = await blockchain.getInfo();
        document.getElementById('chain-length').textContent = blockchainInfo.chainLength;
        document.getElementById('difficulty').textContent = blockchainInfo.difficulty;
        document.getElementById('mining-reward').textContent = blockchainInfo.miningReward;
        document.getElementById('pending-txs').textContent = blockchainInfo.pendingTransactions;
        document.getElementById('consensus-type').textContent = blockchainInfo.consensus;
        document.getElementById('chain-valid').textContent = blockchainInfo.isValid ? 'Yes' : 'No';
        
        const profile = await wallet.getProfile();
        document.getElementById('user-balance').textContent = ui.formatAmount(profile.balance);
        
        const mineBtn = document.getElementById('mine-btn');
        const miningStatus = document.getElementById('mining-status');
        
        mineBtn.addEventListener('click', async () => {
            try {
                mineBtn.disabled = true;
                miningStatus.textContent = 'Mining in progress... Please wait.';
                miningStatus.className = 'mining-status mining';
                
                const result = await wallet.mineBlock();    
                
                miningStatus.textContent = `Block #${result.block.index} mined successfully!`;
                miningStatus.className = 'mining-status success';
                
                await refreshDashboard();
            } catch (error) {
                miningStatus.textContent = `Mining failed: ${error.message}`;
                miningStatus.className = 'mining-status error';
            } finally {
                mineBtn.disabled = false;
            }
        });
        
        const transferForm = document.getElementById('quick-transfer-form');
        transferForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const recipientAddress = document.getElementById('recipient-address').value;
            const amount = document.getElementById('transfer-amount').value;
            const messageElement = document.getElementById('transfer-message');
            
            try {
                messageElement.textContent = 'Sending transaction...';
                messageElement.className = 'message';
                
                await wallet.sendTransaction(recipientAddress, amount);
                
                messageElement.textContent = 'Transaction sent successfully!';
                messageElement.className = 'message success';
                
                document.getElementById('recipient-address').value = '';
                document.getElementById('transfer-amount').value = '';
                
                await loadRecentTransactions();
            } catch (error) {
                messageElement.textContent = `Transaction failed: ${error.message}`;
                messageElement.className = 'message error';
            }
        });
        
        await loadRecentTransactions();
        
        setInterval(refreshDashboard, config.refreshInterval);
        
    } catch (error) {
        console.error('Dashboard initialization error:', error);
    }
}


async function refreshDashboard() {
    try {
        const blockchainInfo = await blockchain.getInfo();
        document.getElementById('chain-length').textContent = blockchainInfo.chainLength;
        document.getElementById('difficulty').textContent = blockchainInfo.difficulty;
        document.getElementById('mining-reward').textContent = blockchainInfo.miningReward;
        document.getElementById('pending-txs').textContent = blockchainInfo.pendingTransactions;
        document.getElementById('chain-valid').textContent = blockchainInfo.isValid ? 'Yes' : 'No';
        
        const profile = await wallet.getProfile();
        document.getElementById('user-balance').textContent = ui.formatAmount(profile.balance);
        
        await loadRecentTransactions();
    } catch (error) {
        console.error('Dashboard refresh error:', error);
    }
}

async function loadRecentTransactions() {
    try {
        const transactionsContainer = document.getElementById('recent-transactions');
        if (!transactionsContainer) return;
        
        transactionsContainer.innerHTML = '<div class="loading">Loading transactions...</div>';
        
        const history = await wallet.getTransactionHistory();
        const currentUser = auth.getCurrentUser();
        
        if (!history || history.length === 0) {
            transactionsContainer.innerHTML = '<div class="no-data">No transactions found</div>';
            return;
        }
        
        const transactionsHtml = history
            .slice(0, config.maxRecentTransactions)
            .map(tx => {
                const formattedTx = blockchain.formatTransaction(tx, currentUser.address);
                
                let typeClass = '';
                if (formattedTx.type === 'SENT') typeClass = 'sent';
                else if (formattedTx.type === 'RECEIVED') typeClass = 'received';
                else if (formattedTx.type === 'REWARD') typeClass = 'reward';
                
                return `
                    <div class="transaction-item">
                        <span class="tx-type ${typeClass}">${formattedTx.type}</span>
                        <div class="tx-details">
                            <div>
                                <span class="tx-amount">${ui.formatAmount(formattedTx.amount)} CTNM</span>
                                ${formattedTx.type !== 'REWARD' ? 
                                    `<span class="tx-address">${formattedTx.shortPartnerAddress}</span>` : 
                                    '<span class="tx-address">Mining Reward</span>'}
                            </div>
                            <div class="tx-time">${formattedTx.formattedTimestamp}</div>
                        </div>
                        <span class="tx-status">${formattedTx.statusText}</span>
                    </div>
                `;
            })
            .join('');
        
        transactionsContainer.innerHTML = transactionsHtml;
        
    } catch (error) {
        console.error('Failed to load transactions:', error);
        document.getElementById('recent-transactions').innerHTML = 
            '<div class="error-message">Failed to load transactions</div>';
    }
}

async function initWallet() {
    try {
        await refreshWalletInfo();
        
        document.getElementById('refresh-wallet').addEventListener('click', refreshWalletInfo);
        
        document.getElementById('copy-address').addEventListener('click', async () => {
            const address = document.getElementById('wallet-address').textContent;
            const success = await ui.copyToClipboard(address);
            
            if (success) {
                alert('Address copied to clipboard!');
            } else {
                alert('Failed to copy address');
            }
        });
        
        const sendForm = document.getElementById('send-form');
        sendForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const recipientAddress = document.getElementById('send-to-address').value;
            const amount = document.getElementById('send-amount').value;
            const messageElement = document.getElementById('send-message');
            
            try {
                messageElement.textContent = 'Sending transaction...';
                messageElement.className = 'message';
                
                await wallet.sendTransaction(recipientAddress, amount);
                
                messageElement.textContent = 'Transaction sent successfully!';
                messageElement.className = 'message success';
                
                document.getElementById('send-to-address').value = '';
                document.getElementById('send-amount').value = '';
                
                await refreshWalletInfo();
            } catch (error) {
                messageElement.textContent = `Transaction failed: ${error.message}`;
                messageElement.className = 'message error';
            }
        });
        
        const mineBtn = document.getElementById('wallet-mine-btn');
        const miningStatus = document.getElementById('wallet-mining-status');
        
        mineBtn.addEventListener('click', async () => {
            try {
                mineBtn.disabled = true;
                miningStatus.textContent = 'Mining in progress... Please wait.';
                miningStatus.className = 'mining-status mining';
                
                const result = await wallet.mineBlock();
                
                miningStatus.textContent = `Block #${result.block.index} mined successfully!`;
                miningStatus.className = 'mining-status success';
                
                await refreshWalletInfo();
            } catch (error) {
                miningStatus.textContent = `Mining failed: ${error.message}`;
                miningStatus.className = 'mining-status error';
            } finally {
                mineBtn.disabled = false;
            }
        });
        
        document.getElementById('refresh-history').addEventListener('click', loadTransactionHistory);
        
        setInterval(refreshWalletInfo, config.refreshInterval);
        
    } catch (error) {
        console.error('Wallet initialization error:', error);
    }
}

async function refreshWalletInfo() {
    try {
        const blockchainInfo = await blockchain.getInfo();
        document.getElementById('current-reward').textContent = `${blockchainInfo.miningReward} CTNM`;
        document.getElementById('mining-difficulty').textContent = blockchainInfo.difficulty;
        
        const profile = await wallet.getProfile();
        document.getElementById('balance-amount').textContent = ui.formatAmount(profile.balance);
        document.getElementById('wallet-address').textContent = profile.address;
        document.getElementById('wallet-username').textContent = profile.username;
        
        await loadTransactionHistory();
    } catch (error) {
        console.error('Failed to refresh wallet:', error);
    }
}

async function loadTransactionHistory() {
    try {
        const transactionList = document.getElementById('transaction-list');
        if (!transactionList) return;
        
        transactionList.innerHTML = '<div class="loading">Loading transaction history...</div>';
        
        const history = await wallet.getTransactionHistory();
        const currentUser = auth.getCurrentUser();
        
        if (!history || history.length === 0) {
            transactionList.innerHTML = '<div class="no-data">No transactions found</div>';
            return;
        }
        
        const transactionsHtml = history.map(tx => {
            const formattedTx = blockchain.formatTransaction(tx, currentUser.address);
            
            return `
                <div class="transaction-row">
                    <div class="tx-type">${formattedTx.type}</div>
                    <div class="tx-amount">${ui.formatAmount(formattedTx.amount)}</div>
                    <div class="tx-address" title="${formattedTx.fullPartnerAddress}">
                        ${formattedTx.type === 'REWARD' ? 'Mining Reward' : formattedTx.shortPartnerAddress}
                    </div>
                    <div class="tx-status">
                        <span class="status-${formattedTx.statusText.toLowerCase()}">${formattedTx.statusText}</span>
                    </div>
                    <div class="tx-time">${formattedTx.formattedTimestamp}</div>
                </div>
            `;
        }).join('');
        
        transactionList.innerHTML = transactionsHtml;
        
    } catch (error) {
        console.error('Failed to load transaction history:', error);
        document.getElementById('transaction-list').innerHTML = 
            '<div class="error-message">Failed to load transaction history</div>';
    }
}


async function initExplorer() {
    let currentPage = 0;
    
    try {
        const blockchainInfo = await blockchain.getInfo();
        document.getElementById('explorer-blocks').textContent = blockchainInfo.chainLength;
        document.getElementById('explorer-difficulty').textContent = blockchainInfo.difficulty;
        document.getElementById('explorer-validity').textContent = blockchainInfo.isValid ? 'Valid' : 'Invalid';
        
        await loadBlocks(currentPage);
        
        document.getElementById('prev-page').addEventListener('click', async () => {
            if (currentPage > 0) {
                currentPage--;
                await loadBlocks(currentPage);
                updatePagination(currentPage);
            }
        });
        
        document.getElementById('next-page').addEventListener('click', async () => {
            currentPage++;
            const result = await loadBlocks(currentPage);
            if (!result.hasMore) {
                currentPage = Math.max(0, currentPage - 1);
            }
            updatePagination(currentPage);
        });
        
        document.getElementById('refresh-explorer').addEventListener('click', async () => {
            currentPage = 0;
            await loadBlocks(currentPage);
            updatePagination(currentPage);
            
            const info = await blockchain.getInfo();
            document.getElementById('explorer-blocks').textContent = info.chainLength;
            document.getElementById('explorer-difficulty').textContent = info.difficulty;
            document.getElementById('explorer-validity').textContent = info.isValid ? 'Valid' : 'Invalid';
        });
        
        document.getElementById('search-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const searchType = document.getElementById('search-type').value;
            const query = document.getElementById('search-query').value.trim();
            
            if (!query) return;
            
            try {
                if (searchType === 'block') {
                    const blockIndex = parseInt(query);
                    if (!isNaN(blockIndex)) {
                        await showBlockDetails(blockIndex);
                    } else {
                        alert('Please enter a valid block number');
                    }
                } else {
                    alert('Search by transaction or address is not implemented yet');
                }
            } catch (error) {
                console.error('Search error:', error);
                alert(`Search failed: ${error.message}`);
            }
        });
        
        document.getElementById('close-detail').addEventListener('click', () => {
            document.getElementById('block-detail').style.display = 'none';
        });
        
    } catch (error) {
        console.error('Explorer initialization error:', error);
    }
}

/**
 * @param {number} page - Page number
 * @returns {Promise} - Blocks data
 */
async function loadBlocks(page) {
    try {
        const blocksTableBody = document.getElementById('blocks-table-body');
        blocksTableBody.innerHTML = '<tr><td colspan="5" class="loading-row">Loading blocks...</td></tr>';
        
        const result = await blockchain.getBlocks(page);
        
        if (!result.blocks || result.blocks.length === 0) {
            blocksTableBody.innerHTML = '<tr><td colspan="5" class="loading-row">No blocks found</td></tr>';
            return result;
        }
        
        let blocksHtml = '';
        result.blocks.forEach(block => {
            const formattedBlock = blockchain.formatBlock(block);
            
            blocksHtml += `
                <tr data-block-index="${block.index}">
                    <td>${block.index}</td>
                    <td>${formattedBlock.shortHash}</td>
                    <td>${formattedBlock.formattedTimestamp}</td>
                    <td>${formattedBlock.transactionCount}</td>
                    <td>${getMinerAddress(block)}</td>
                </tr>
            `;
        });
        
        blocksTableBody.innerHTML = blocksHtml;
        
        document.querySelectorAll('#blocks-table-body tr').forEach(row => {
            row.addEventListener('click', () => {
                const blockIndex = row.dataset.blockIndex;
                if (blockIndex) {
                    showBlockDetails(parseInt(blockIndex));
                }
            });
        });
        
        return result;
    } catch (error) {
        console.error('Failed to load blocks:', error);
        document.getElementById('blocks-table-body').innerHTML = 
            '<tr><td colspan="5" class="loading-row">Error loading blocks</td></tr>';
        throw error;
    }
}

/**
 * @param {Object} block - Block data
 * @returns {string} Miner address or 'Genesis'
 */
function getMinerAddress(block) {
    if (block.index === 0) return 'Genesis';
    
    if (Array.isArray(block.data)) {
        const minerTx = block.data.find(tx => tx.from === 'BLOCKCHAIN_REWARD');
        if (minerTx && minerTx.to) {
            const address = minerTx.to;
            return address.substring(0, 8) + '...';
        }
    }
    
    return 'Unknown';
}

/**
 * @param {number} blockIndex - Block index
 */
async function showBlockDetails(blockIndex) {
    try {
        const detailView = document.getElementById('block-detail');
        const txList = document.getElementById('detail-tx-list');
        
        txList.innerHTML = '<div class="loading">Loading block details...</div>';
        detailView.style.display = 'block';
        
        const block = await blockchain.getBlock(blockIndex);
        const formattedBlock = blockchain.formatBlock(block);
        
        document.getElementById('detail-index').textContent = block.index;
        document.getElementById('detail-hash').textContent = block.hash;
        document.getElementById('detail-prev-hash').textContent = block.previousHash;
        document.getElementById('detail-timestamp').textContent = formattedBlock.formattedTimestamp;
        document.getElementById('detail-nonce').textContent = block.nonce;
        document.getElementById('detail-tx-count').textContent = formattedBlock.transactionCount;
        
        if (!Array.isArray(block.data) || block.data.length === 0) {
            txList.innerHTML = '<div class="no-data">No transactions in this block</div>';
            return;
        }
        
        const txHtml = block.data.map(tx => {
            return `
                <div class="transaction-row">
                    <div class="tx-from" title="${tx.from}">${tx.from === 'BLOCKCHAIN_REWARD' ? 'REWARD' : tx.from.substring(0, 10) + '...'}</div>
                    <div class="tx-to" title="${tx.to}">${tx.to.substring(0, 10) + '...'}</div>
                    <div class="tx-amount">${ui.formatAmount(tx.amount)}</div>
                    <div class="tx-time">${ui.formatTimestamp(tx.timestamp)}</div>
                </div>
            `;
        }).join('');
        
        txList.innerHTML = txHtml;
        
    } catch (error) {
        console.error('Failed to load block details:', error);
        document.getElementById('detail-tx-list').innerHTML = 
            '<div class="error-message">Failed to load block details</div>';
    }
}

/**
 * @param {number} currentPage - Current page
 */
function updatePagination(currentPage) {
    document.getElementById('prev-page').disabled = currentPage === 0;
    document.getElementById('page-indicator').textContent = `Page ${currentPage + 1}`;
}