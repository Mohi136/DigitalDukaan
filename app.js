// DigitalDukaan - Application Orchestration Engine
// Features: Multi-tenant local Auth, POS checkout with Udhaar selector, Udhaari Ledger, SMS alerts gateway, Daily profit calculations, Chart.js bar views, and quick dues purges (Cross button)

document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------
    // 1. DEFAULT DATA CONFIGURATIONS
    // ----------------------------------------------------
    const DEFAULT_PRODUCTS = [
        { name: "Aashirvaad Shudh Chakki Atta 5kg", category: "Groceries", stock: 24, minAlert: 5, purchasePrice: 210.00, sellingPrice: 260.00 },
        { name: "Amul Pasteurised Salted Butter 500g", category: "Dairy", stock: 15, minAlert: 6, purchasePrice: 220.00, sellingPrice: 275.00 },
        { name: "Tata Salt Vacuum Evaporated 1kg", category: "Groceries", stock: 45, minAlert: 10, purchasePrice: 18.00, sellingPrice: 24.00 },
        { name: "Maggi 2-Minute Masala Noodles 280g", category: "Snacks & Sweets", stock: 8, minAlert: 15, purchasePrice: 120.00, sellingPrice: 140.00 },
        { name: "Fortune Soya Health Refined Oil 1L", category: "Spices & Oils", stock: 18, minAlert: 5, purchasePrice: 130.00, sellingPrice: 165.00 },
        { name: "Taj Mahal Tea Leaves 250g", category: "Beverages", stock: 4, minAlert: 5, purchasePrice: 150.00, sellingPrice: 185.00 },
        { name: "Haldiram's Bhujia Sev 400g", category: "Snacks & Sweets", stock: 32, minAlert: 8, purchasePrice: 80.00, sellingPrice: 110.00 },
        { name: "Coca-Cola Original Taste 1.25L", category: "Beverages", stock: 20, minAlert: 6, purchasePrice: 55.00, sellingPrice: 70.00 },
        { name: "Dettol Handwash Refill 175ml", category: "Household", stock: 3, minAlert: 5, purchasePrice: 75.00, sellingPrice: 99.00 },
        { name: "Vim Dishwash Gel Lemon 500ml", category: "Household", stock: 12, minAlert: 4, purchasePrice: 90.00, sellingPrice: 115.00 },
        { name: "Mother Dairy Full Cream Milk 1L", category: "Dairy", stock: 0, minAlert: 8, purchasePrice: 54.00, sellingPrice: 68.00 },
        { name: "Surf Excel Detergent 1kg", category: "Household", stock: 10, minAlert: 3, purchasePrice: 115.00, sellingPrice: 140.00 }
    ];

    const MOCK_CUSTOMERS = [
        { name: "Ramesh Sharma", phone: "9876543210", type: "high-value" },
        { name: "Sunita Verma", phone: "9812345678", type: "all" },
        { name: "Amit Patel", phone: "9988776655", type: "high-value" },
        { name: "Priya Nair", phone: "9765432109", type: "inactive" },
        { name: "Vijay Gupta", phone: "9543210987", type: "all" }
    ];

    const DEFAULT_UDHAARI = [
        { customerName: "Ramesh Sharma", phone: "9876543210", pendingAmount: 450.00, lastActivity: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
        { customerName: "Priya Nair", phone: "9765432109", pendingAmount: 1200.00, lastActivity: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
        { customerName: "Amit Patel", phone: "9988776655", pendingAmount: 0.00, lastActivity: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() }
    ];

    // Helper: Generate 30 days of realistic history
    function generateHistoricalTransactions(userProducts) {
        const transactions = [];
        const baseSales = 2200; 
        
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            
            const dayOfWeek = date.getDay();
            let multiplier = 1.0;
            if (dayOfWeek === 0 || dayOfWeek === 6) multiplier = 1.35; 
            if (dayOfWeek === 5) multiplier = 1.15; 
            
            const randomFluct = 0.85 + Math.random() * 0.3; 
            const dailyTotal = Math.round(baseSales * multiplier * randomFluct);
            
            const invoicesCount = 2 + Math.floor(Math.random() * 3); 
            let dayAccumulated = 0;
            
            for (let t = 0; t < invoicesCount; t++) {
                const isLast = (t === invoicesCount - 1);
                const txTotal = isLast ? (dailyTotal - dayAccumulated) : Math.round((dailyTotal / invoicesCount) * (0.7 + Math.random() * 0.6));
                dayAccumulated += txTotal;
                
                const randomCust = MOCK_CUSTOMERS[Math.floor(Math.random() * MOCK_CUSTOMERS.length)];
                
                const itemsCount = 1 + Math.floor(Math.random() * 3);
                const items = [];
                let costEstimate = 0;
                
                for (let k = 0; k < itemsCount; k++) {
                    const prod = userProducts[Math.floor(Math.random() * userProducts.length)];
                    const qty = 1 + Math.floor(Math.random() * 2);
                    items.push({
                        name: prod.name,
                        qty: qty,
                        price: prod.sellingPrice,
                        cost: prod.purchasePrice
                    });
                    costEstimate += prod.purchasePrice * qty;
                }
                
                const subtotal = Math.round(txTotal / 1.18);
                const tax = txTotal - subtotal;
                
                transactions.push({
                    id: `INV-${date.getFullYear()}-${10000 + transactions.length}`,
                    date: date.toISOString(),
                    customerName: randomCust.name,
                    customerPhone: randomCust.phone,
                    subtotal: subtotal,
                    cgst: Math.round(tax / 2),
                    sgst: Math.round(tax / 2),
                    total: txTotal,
                    costTotal: Math.round(costEstimate),
                    profit: Math.round(txTotal - costEstimate),
                    paymentMethod: Math.random() > 0.35 ? 'Cash' : (Math.random() > 0.5 ? 'Online' : 'Udhaar'),
                    items: items
                });
            }
        }
        return transactions;
    }

    // App Core State
    const state = {
        currentUser: null,      
        products: [],           
        transactions: [],       
        udhaari: [],            // Scoped customer debts
        cart: [],
        activeTab: 'dashboard',
        activePaymentMode: 'Cash', // Cash | Online | Udhaar
        smsLogs: [
            { type: 'received', msg: 'Hello shop! Can I get an SMS of my outstanding balance?', time: '12:30 PM' },
            { type: 'sent', msg: 'Namaste! Outstanding balance reminders can be triggered dynamically from your Udhaari Tracker Tab.', time: '12:31 PM' }
        ],
        charts: {},
        selectedUdhaariCustomer: null
    };

    // ----------------------------------------------------
    // 2. AUTHENTICATION & MULTI-TENANCY CORE
    // ----------------------------------------------------
    const seedUsers = () => {
        let currentUsers = JSON.parse(localStorage.getItem('dd_users'));
        if (!currentUsers) {
            currentUsers = [
                { username: 'admin', password: 'admin', shopName: 'Mohit Trading', phone: '9999988888' }
            ];
            localStorage.setItem('dd_users', JSON.stringify(currentUsers));
        }
        return currentUsers;
    };
    
    let usersDb = seedUsers();

    const checkActiveSession = () => {
        const session = JSON.parse(localStorage.getItem('dd_session'));
        if (session) {
            loginUserSession(session);
        } else {
            document.getElementById('auth-overlay').classList.remove('hidden');
        }
    };

    function loginUserSession(user) {
        state.currentUser = user;
        
        const userProductsKey = `dd_products_${user.username}`;
        const userTransactionsKey = `dd_transactions_${user.username}`;
        const userUdhaariKey = `dd_udhaari_${user.username}`;
        
        state.products = JSON.parse(localStorage.getItem(userProductsKey));
        if (!state.products) {
            state.products = [...DEFAULT_PRODUCTS];
            localStorage.setItem(userProductsKey, JSON.stringify(state.products));
        }

        state.transactions = JSON.parse(localStorage.getItem(userTransactionsKey));
        if (!state.transactions) {
            state.transactions = generateHistoricalTransactions(state.products);
            localStorage.setItem(userTransactionsKey, JSON.stringify(state.transactions));
        }

        state.udhaari = JSON.parse(localStorage.getItem(userUdhaariKey));
        if (!state.udhaari) {
            state.udhaari = [...DEFAULT_UDHAARI];
            localStorage.setItem(userUdhaariKey, JSON.stringify(state.udhaari));
        }

        // Apply HTML Profile bindings
        document.getElementById('sidebar-merchant-name').textContent = user.username;
        document.getElementById('sidebar-shop-name').textContent = user.shopName;
        document.getElementById('sidebar-avatar').textContent = user.username.substring(0, 2).toUpperCase();
        document.getElementById('header-status-text').textContent = `${user.shopName} Live`;

        document.getElementById('auth-overlay').classList.add('hidden');
        
        state.cart = [];
        state.selectedUdhaariCustomer = null;
        
        const dashboardNavItem = document.querySelector('[data-tab="dashboard"]');
        if (dashboardNavItem) dashboardNavItem.click();
    }

    const tabLoginBtn = document.getElementById('btn-tab-login');
    const tabRegisterBtn = document.getElementById('btn-tab-register');
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');

    tabLoginBtn.addEventListener('click', () => {
        tabLoginBtn.classList.add('active');
        tabRegisterBtn.classList.remove('active');
        formLogin.classList.remove('hidden');
        formRegister.classList.add('hidden');
    });

    tabRegisterBtn.addEventListener('click', () => {
        tabRegisterBtn.classList.add('active');
        tabLoginBtn.classList.remove('active');
        formRegister.classList.remove('hidden');
        formLogin.classList.add('hidden');
    });

    formLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        const usernameVal = document.getElementById('login-username').value.trim();
        const passwordVal = document.getElementById('login-password').value;

        const match = usersDb.find(u => u.username.toLowerCase() === usernameVal.toLowerCase() && u.password === passwordVal);
        if (match) {
            localStorage.setItem('dd_session', JSON.stringify(match));
            loginUserSession(match);
            formLogin.reset();
        } else {
            alert("Incorrect credentials! Please verify Username and Password.");
        }
    });

    formRegister.addEventListener('submit', (e) => {
        e.preventDefault();
        const shopName = document.getElementById('reg-shopname').value.trim();
        const username = document.getElementById('reg-username').value.trim();
        const phone = document.getElementById('reg-phone').value.trim();
        const password = document.getElementById('reg-password').value;

        if (usersDb.some(u => u.username.toLowerCase() === username.toLowerCase())) {
            alert("This merchant username has already been registered!");
            return;
        }

        if (!/^\d{10}$/.test(phone)) {
            alert("Please enter a valid 10-digit mobile number.");
            return;
        }

        const newUser = { username, password, shopName, phone };
        usersDb.push(newUser);
        localStorage.setItem('dd_users', JSON.stringify(usersDb));

        alert(`Shop "${shopName}" registered successfully! Please log in.`);
        formRegister.reset();
        tabLoginBtn.click();
    });

    document.getElementById('btn-logout').addEventListener('click', () => {
        if (confirm("Are you sure you want to log out?")) {
            localStorage.removeItem('dd_session');
            state.currentUser = null;
            state.products = [];
            state.transactions = [];
            state.cart = [];
            state.udhaari = [];
            document.getElementById('auth-overlay').classList.remove('hidden');
        }
    });

    function saveProducts() {
        if (state.currentUser) {
            localStorage.setItem(`dd_products_${state.currentUser.username}`, JSON.stringify(state.products));
        }
    }
    
    function saveTransactions() {
        if (state.currentUser) {
            localStorage.setItem(`dd_transactions_${state.currentUser.username}`, JSON.stringify(state.transactions));
        }
    }

    function saveUdhaari() {
        if (state.currentUser) {
            localStorage.setItem(`dd_udhaari_${state.currentUser.username}`, JSON.stringify(state.udhaari));
        }
    }

    // ----------------------------------------------------
    // 3. SPA ROUTER & VIEW MANAGEMENT
    // ----------------------------------------------------
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');
    const pageCurrentTitle = document.getElementById('page-current-title');
    const pageCurrentSubtitle = document.getElementById('page-current-subtitle');

    const tabSubtitles = {
        dashboard: "Real-time snapshot of your shop",
        billing: "Sleek Point-of-Sale cash-register checkout terminal",
        inventory: "Track item volumes, thresholds, pricing and low-alerts",
        udhaari: "Track outstanding customer credits and trigger payment reminder messages"
    };

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const clickedItem = e.currentTarget;
            const targetTab = clickedItem.getAttribute('data-tab');
            
            navItems.forEach(nav => nav.classList.remove('active'));
            clickedItem.classList.add('active');
            
            tabContents.forEach(tab => tab.classList.remove('active'));
            document.getElementById(`${targetTab}-tab`).classList.add('active');
            
            state.activeTab = targetTab;
            pageCurrentTitle.textContent = clickedItem.querySelector('span').textContent;
            pageCurrentSubtitle.textContent = tabSubtitles[targetTab];
            
            if (targetTab === 'dashboard') {
                renderDashboardMetrics();
                renderSalesChart();
                renderRecentTransactions();
                renderTopProducts();
                renderDashboardDuesCard(); // Dynamic dues card list on dashboard!
            } else if (targetTab === 'billing') {
                renderPOSCatalog();
            } else if (targetTab === 'inventory') {
                renderInventoryTable();
            } else if (targetTab === 'udhaari') {
                renderUdhaariLedger();
            }
        });
    });

    document.getElementById('btn-quick-sell').addEventListener('click', () => {
        const billingNavItem = document.querySelector('[data-tab="billing"]');
        if (billingNavItem) billingNavItem.click();
    });

    lucide.createIcons();

    // ----------------------------------------------------
    // 4. DAILY SALES & PROFIT CALCULATIONS
    // ----------------------------------------------------
    function calculateTodayStats() {
        const todayStr = new Date().toDateString();
        let sales = 0;
        let profit = 0;
        
        state.transactions.forEach(tx => {
            if (new Date(tx.date).toDateString() === todayStr) {
                sales += tx.total;
                profit += tx.profit;
            }
        });

        if (sales === 0 && state.transactions.length > 0) {
            const lastTxDateStr = new Date(state.transactions[state.transactions.length - 1].date).toDateString();
            state.transactions.forEach(tx => {
                if (new Date(tx.date).toDateString() === lastTxDateStr) {
                    sales += tx.total;
                    profit += tx.profit;
                }
            });
        }
        
        return { sales, profit };
    }

    function renderDashboardMetrics() {
        const stats = calculateTodayStats();
        
        document.getElementById('header-today-profit').textContent = `₹${stats.profit.toLocaleString('en-IN')}`;
        document.getElementById('dash-profit').textContent = `₹${stats.profit.toLocaleString('en-IN')}`;
        document.getElementById('dash-revenue').textContent = `₹${stats.sales.toLocaleString('en-IN')}`;
        
        document.getElementById('dash-inventory').textContent = `${state.products.length} Products`;
        
        // Outstanding Dues card
        let totalDues = 0;
        state.udhaari.forEach(u => totalDues += u.pendingAmount);
        document.getElementById('dash-outstanding-dues').textContent = `₹${totalDues.toLocaleString('en-IN')}`;
        
        // Low Stock alert counts
        const lowStockCount = state.products.filter(p => p.stock <= p.minAlert).length;
        const lowStockText = document.getElementById('dash-lowstock-alert');
        if (lowStockCount > 0) {
            lowStockText.innerHTML = `<i data-lucide="alert-triangle" style="color: var(--accent-rose);"></i> <span style="color: var(--accent-rose); font-weight: 700;">${lowStockCount} items low in stock!</span>`;
        } else {
            lowStockText.innerHTML = `<i data-lucide="check-circle" style="color: var(--accent-emerald);"></i> <span>All stock levels healthy</span>`;
        }
        
        lucide.createIcons();
    }

    // Top Products aggregator
    function renderTopProducts() {
        const topContainer = document.getElementById('dashboard-top-products');
        topContainer.innerHTML = '';

        const counts = {};
        state.transactions.forEach(tx => {
            tx.items.forEach(item => {
                counts[item.name] = (counts[item.name] || 0) + item.qty;
            });
        });

        const sorted = Object.keys(counts)
            .map(name => ({ name, qty: counts[name] }))
            .sort((a,b) => b.qty - a.qty)
            .slice(0, 2); 

        if (sorted.length === 0) {
            topContainer.innerHTML = `<div style="text-align: center; padding: 12px; color: var(--text-muted); font-size:11px;">No sales logged.</div>`;
            return;
        }

        sorted.forEach((prod, index) => {
            const itemHTML = `
                <div class="transaction-item" style="padding: 8px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; width:100%; font-size:11px;">
                        <span><strong style="color:var(--accent-saffron); margin-right:4px;">#${index+1}</strong> ${prod.name.substring(0, 18)}..</span>
                        <span style="font-weight:700;">${prod.qty} sold</span>
                    </div>
                </div>
            `;
            topContainer.insertAdjacentHTML('beforeend', itemHTML);
        });
    }

    function renderRecentTransactions() {
        const listContainer = document.getElementById('dashboard-tx-list');
        listContainer.innerHTML = '';
        
        const sortedTx = [...state.transactions].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 2);
        
        if (sortedTx.length === 0) {
            listContainer.innerHTML = `<div style="text-align: center; padding: 12px; color: var(--text-muted); font-size:11px;">No invoices generated.</div>`;
            return;
        }
        
        sortedTx.forEach(tx => {
            let statusBadge = '';
            if (tx.paymentMethod === 'Udhaar') {
                statusBadge = `<span class="tx-badge pending">Udhaar</span>`;
            } else {
                statusBadge = `<span class="tx-badge success">Paid</span>`;
            }

            const itemHTML = `
                <div class="transaction-item" style="padding: 8px;">
                    <div class="tx-details">
                        <span class="tx-id" style="font-size:11px;">${tx.id}</span>
                        <span class="tx-customer" style="font-size:9px;">${tx.customerName || 'Walk-in'} • ${tx.items.length} items</span>
                    </div>
                    <div class="tx-amount-block" style="gap:2px;">
                        <span class="tx-amount" style="font-size:11px; color: ${tx.paymentMethod==='Udhaar' ? 'var(--accent-rose)':'var(--accent-emerald)'}">₹${tx.total}</span>
                        ${statusBadge}
                    </div>
                </div>
            `;
            listContainer.insertAdjacentHTML('beforeend', itemHTML);
        });
    }

    // ----------------------------------------------------
    // 5. CUSTOMER DUES TRACKER DASHBOARD CARD (NEW!)
    // ----------------------------------------------------
    function renderDashboardDuesCard() {
        const duesContainer = document.getElementById('dashboard-dues-list');
        duesContainer.innerHTML = '';

        // Filter customers who owe dues
        const debtors = state.udhaari.filter(u => u.pendingAmount > 0)
            .sort((a, b) => b.pendingAmount - a.pendingAmount)
            .slice(0, 3); // show top 3 on dashboard

        if (debtors.length === 0) {
            duesContainer.innerHTML = `
                <div style="text-align: center; padding: 16px; color: var(--text-muted); font-size: 11px;">
                    🎉 All customer accounts cleared!
                </div>
            `;
            return;
        }

        debtors.forEach(debtor => {
            const rowHTML = `
                <div class="transaction-item" style="padding: 8px 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; font-size: 11px;">
                        <div>
                            <strong style="color: var(--text-primary);">${debtor.customerName}</strong>
                            <div style="font-size: 9px; color: var(--text-muted); margin-top: 1px;">+91 ${debtor.phone}</div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="color: var(--accent-rose); font-weight: 700;">₹${debtor.pendingAmount}</span>
                            <button class="dues-cross-btn" onclick="deleteUdhaariEntryDirect('${debtor.phone}')" title="Delete record">
                                <i data-lucide="x" style="width: 12px; height: 12px;"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            duesContainer.insertAdjacentHTML('beforeend', rowHTML);
        });

        lucide.createIcons();
    }

    // Slices directly from Dashboard card
    window.deleteUdhaariEntryDirect = function(phone) {
        const match = state.udhaari.find(u => u.phone === phone);
        if (!match) return;

        if (confirm(`Purge ledger? Are you sure you want to completely remove "${match.customerName}" from the Udhaari ledger? Outstanding dues of ₹${match.pendingAmount} will be wiped!`)) {
            state.udhaari = state.udhaari.filter(u => u.phone !== phone);
            saveUdhaari();
            
            // Refresh
            renderDashboardDuesCard();
            renderDashboardMetrics();
            if (state.activeTab === 'udhaari') renderUdhaariLedger();
        }
    };

    // ----------------------------------------------------
    // 6. BILLING (POS) & CART ENGINE
    // ----------------------------------------------------
    let currentCategoryFilter = 'all';
    let searchQuery = '';

    function renderPOSCatalog() {
        const grid = document.getElementById('pos-items-grid');
        grid.innerHTML = '';
        
        const categories = ['all', ...new Set(state.products.map(p => p.category))];
        
        const chipsContainer = document.getElementById('pos-categories-chips');
        chipsContainer.innerHTML = '';
        categories.forEach(cat => {
            const activeClass = (cat === currentCategoryFilter) ? 'active' : '';
            chipsContainer.insertAdjacentHTML('beforeend', `
                <div class="category-chip ${activeClass}" data-category="${cat}">${cat}</div>
            `);
        });
        
        const select = document.getElementById('pos-category-select');
        select.innerHTML = '<option value="all">All Categories</option>';
        categories.filter(c => c !== 'all').forEach(cat => {
            select.insertAdjacentHTML('beforeend', `<option value="${cat}">${cat}</option>`);
        });
        select.value = currentCategoryFilter;

        const filteredProducts = state.products.filter(p => {
            const matchesCat = (currentCategoryFilter === 'all' || p.category === currentCategoryFilter);
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCat && matchesSearch;
        });

        if (filteredProducts.length === 0) {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);"><i data-lucide="info" style="margin: 0 auto 12px auto; display: block;"></i>No matching products in stock</div>`;
            lucide.createIcons();
            return;
        }

        filteredProducts.forEach(prod => {
            let badgeHTML = '';
            if (prod.stock === 0) {
                badgeHTML = `<span class="product-item-badge out">SOLD OUT</span>`;
            } else if (prod.stock <= prod.minAlert) {
                badgeHTML = `<span class="product-item-badge low">LOW STOCK</span>`;
            } else {
                badgeHTML = `<span class="product-item-badge ok">IN STOCK</span>`;
            }

            const cardHTML = `
                <div class="product-item-card" data-name="${prod.name}">
                    ${badgeHTML}
                    <div class="product-item-info">
                        <div class="product-item-name">${prod.name}</div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                            <span class="product-item-price">₹${prod.sellingPrice}</span>
                            <span class="product-item-stock">Stock: ${prod.stock}</span>
                        </div>
                    </div>
                </div>
            `;
            grid.insertAdjacentHTML('beforeend', cardHTML);
        });

        document.querySelectorAll('.product-item-card').forEach(card => {
            card.addEventListener('click', () => {
                const prodName = card.getAttribute('data-name');
                const targetProduct = state.products.find(p => p.name === prodName);
                if (targetProduct) {
                    addToCart(targetProduct);
                }
            });
        });

        document.querySelectorAll('.category-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                currentCategoryFilter = e.target.getAttribute('data-category');
                renderPOSCatalog();
            });
        });
        
        lucide.createIcons();
    }

    document.getElementById('pos-product-search').addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderPOSCatalog();
    });

    document.getElementById('pos-category-select').addEventListener('change', (e) => {
        currentCategoryFilter = e.target.value;
        renderPOSCatalog();
    });

    function addToCart(product) {
        if (product.stock === 0) {
            alert(`"${product.name}" is OUT OF STOCK. Please restock from the Inventory tab first!`);
            return;
        }

        const existingCartItem = state.cart.find(item => item.product.name === product.name);
        
        if (existingCartItem) {
            if (existingCartItem.quantity >= product.stock) {
                alert(`Cannot add more. Only ${product.stock} units available in stock!`);
                return;
            }
            existingCartItem.quantity++;
        } else {
            state.cart.push({ product: product, quantity: 1 });
        }
        
        renderCart();
    }

    function renderCart() {
        const cartContainer = document.getElementById('cart-items-section');
        cartContainer.innerHTML = '';
        
        if (state.cart.length === 0) {
            cartContainer.innerHTML = `
                <div class="cart-empty-state">
                    <i data-lucide="shopping-bag"></i>
                    <p>Billing cart is empty</p>
                </div>
            `;
            document.getElementById('cart-subtotal').textContent = '₹0.00';
            document.getElementById('cart-cgst').textContent = '₹0.00';
            document.getElementById('cart-sgst').textContent = '₹0.00';
            document.getElementById('cart-total').textContent = '₹0.00';
            lucide.createIcons();
            return;
        }

        let subtotal = 0;
        state.cart.forEach((item, index) => {
            const itemTotal = item.product.sellingPrice * item.quantity;
            subtotal += itemTotal;
            
            const rowHTML = `
                <div class="cart-item-row">
                    <div class="cart-item-info">
                        <div class="cart-item-name" title="${item.product.name}">${item.product.name}</div>
                        <div class="cart-item-sub">₹${item.product.sellingPrice} / unit</div>
                    </div>
                    <div class="cart-item-actions">
                        <button class="qty-btn" onclick="adjustCartQty(${index}, -1)">-</button>
                        <span class="cart-item-qty">${item.quantity}</span>
                        <button class="qty-btn" onclick="adjustCartQty(${index}, 1)">+</button>
                    </div>
                    <span class="cart-item-price">₹${itemTotal}</span>
                    <i data-lucide="trash-2" class="cart-item-remove" onclick="removeCartItem(${index})"></i>
                </div>
            `;
            cartContainer.insertAdjacentHTML('beforeend', rowHTML);
        });

        const taxRate = 0.18;
        const total = subtotal;
        const baseAmount = total / (1 + taxRate);
        const totalGST = total - baseAmount;
        const cgst = totalGST / 2;
        const sgst = totalGST / 2;

        document.getElementById('cart-subtotal').textContent = `₹${Math.round(baseAmount).toLocaleString('en-IN')}`;
        document.getElementById('cart-cgst').textContent = `₹${Math.round(cgst).toLocaleString('en-IN')}`;
        document.getElementById('cart-sgst').textContent = `₹${Math.round(sgst).toLocaleString('en-IN')}`;
        document.getElementById('cart-total').textContent = `₹${total.toLocaleString('en-IN')}`;

        lucide.createIcons();
    }

    window.selectPaymentMode = function(mode) {
        state.activePaymentMode = mode;
        
        document.getElementById('btn-pay-cash').classList.remove('active-payment');
        document.getElementById('btn-pay-online').classList.remove('active-payment');
        document.getElementById('btn-pay-udhaar').classList.remove('active-payment');
        
        if (mode === 'Cash') {
            document.getElementById('btn-pay-cash').classList.add('active-payment');
            document.getElementById('req-star-name').style.display = 'none';
            document.getElementById('req-star-phone').style.display = 'none';
        } else if (mode === 'Online') {
            document.getElementById('btn-pay-online').classList.add('active-payment');
            document.getElementById('req-star-name').style.display = 'none';
            document.getElementById('req-star-phone').style.display = 'none';
        } else if (mode === 'Udhaar') {
            document.getElementById('btn-pay-udhaar').classList.add('active-payment');
            document.getElementById('req-star-name').style.display = 'inline';
            document.getElementById('req-star-phone').style.display = 'inline';
        }
    };

    document.getElementById('btn-pay-cash').addEventListener('click', () => selectPaymentMode('Cash'));
    document.getElementById('btn-pay-online').addEventListener('click', () => selectPaymentMode('Online'));
    document.getElementById('btn-pay-udhaar').addEventListener('click', () => selectPaymentMode('Udhaar'));

    document.getElementById('btn-checkout').addEventListener('click', () => {
        if (state.cart.length === 0) {
            alert("Billing cart is empty!");
            return;
        }

        const customerNameInput = document.getElementById('customer-name');
        const customerPhoneInput = document.getElementById('customer-phone');
        
        const customerName = customerNameInput.value.trim();
        const customerPhone = customerPhoneInput.value.trim();

        if (state.activePaymentMode === 'Udhaar') {
            if (!customerName || !customerPhone) {
                alert("Customer Name and 10-digit Mobile number are required to record a balance in the Udhaari ledger!");
                return;
            }
        }

        if (customerPhone && !/^\d{10}$/.test(customerPhone)) {
            alert("Please enter a valid 10-digit mobile number!");
            return;
        }

        // Deduct stock quantities instantly
        state.cart.forEach(item => {
            const product = state.products.find(p => p.name === item.product.name);
            if (product) {
                product.stock -= item.quantity;
            }
        });
        saveProducts();

        let subtotal = 0;
        let costTotal = 0;
        state.cart.forEach(item => {
            subtotal += item.product.sellingPrice * item.quantity;
            costTotal += item.product.purchasePrice * item.quantity;
        });

        const taxRate = 0.18;
        const baseAmount = Math.round(subtotal / (1 + taxRate));
        const cgst = Math.round((subtotal - baseAmount) / 2);
        const sgst = cgst;
        const netProfit = subtotal - costTotal;

        const invId = `INV-${new Date().getFullYear()}-${10000 + state.transactions.length}`;
        const newTx = {
            id: invId,
            date: new Date().toISOString(),
            customerName: customerName || 'Walk-in Customer',
            customerPhone: customerPhone || 'None',
            subtotal: baseAmount,
            cgst: cgst,
            sgst: sgst,
            total: subtotal,
            costTotal: costTotal,
            profit: netProfit,
            paymentMethod: state.activePaymentMode,
            items: state.cart.map(item => ({
                name: item.product.name,
                qty: item.quantity,
                price: item.product.sellingPrice,
                cost: item.product.purchasePrice
            }))
        };

        state.transactions.push(newTx);
        saveTransactions();

        if (state.activePaymentMode === 'Udhaar') {
            const existingDebt = state.udhaari.find(u => u.phone === customerPhone);
            if (existingDebt) {
                existingDebt.pendingAmount += subtotal;
                existingDebt.customerName = customerName;
                existingDebt.lastActivity = new Date().toISOString();
            } else {
                state.udhaari.push({
                    customerName: customerName,
                    phone: customerPhone,
                    pendingAmount: subtotal,
                    lastActivity: new Date().toISOString()
                });
            }
            saveUdhaari();
        }

        const shopName = state.currentUser ? state.currentUser.shopName : 'DigitalDukaan';

        const receiptContainer = document.getElementById('printable-receipt');
        receiptContainer.innerHTML = `
            <div class="receipt-header">
                <div class="receipt-shop-name">${shopName}</div>
                <div style="font-size: 10px; margin-top:4px;">GSTIN: 07AAAAA1111A1Z1</div>
            </div>
            <div class="receipt-divider"></div>
            <div class="receipt-detail-row">
                <span>INVOICE: ${invId}</span>
                <span>DATE: ${new Date().toLocaleDateString()}</span>
            </div>
            <div class="receipt-detail-row">
                <span>CUST: ${customerName || 'Walk-in'}</span>
                <span>MODE: ${state.activePaymentMode}</span>
            </div>
            <div class="receipt-divider"></div>
            <table class="receipt-table">
                <thead>
                    <tr>
                        <th style="width: 50%;">ITEM</th>
                        <th style="text-align: center; width: 15%;">QTY</th>
                        <th style="text-align: right; width: 15%;">RATE</th>
                        <th style="text-align: right; width: 20%;">TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    ${newTx.items.map(item => `
                        <tr>
                            <td>${item.name.substring(0, 18)}..</td>
                            <td style="text-align: center;">${item.qty}</td>
                            <td style="text-align: right;">₹${item.price}</td>
                            <td style="text-align: right;">₹${item.price * item.qty}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="receipt-divider"></div>
            <div class="receipt-summary">
                <div class="receipt-summary-row">
                    <span>Taxable:</span>
                    <span>₹${baseAmount}</span>
                </div>
                <div class="receipt-summary-row">
                    <span>CGST/SGST:</span>
                    <span>₹${cgst + sgst}</span>
                </div>
                <div class="receipt-summary-row bold">
                    <span>GRAND TOTAL:</span>
                    <span>₹${subtotal}</span>
                </div>
            </div>
            <div class="receipt-divider"></div>
            <div class="receipt-footer">
                🙏 THANK YOU - VISIT AGAIN 🙏
                <div style="font-size: 8px; margin-top: 4px; color: #555;">Powered by DigitalDukaan</div>
            </div>
        `;

        document.getElementById('receipt-modal').classList.add('active');

        state.cart = [];
        customerNameInput.value = '';
        customerPhoneInput.value = '';
        selectPaymentMode('Cash');
        renderCart();
        renderPOSCatalog();
        lucide.createIcons();
    });

    // Close & Print Receipt Modal Controllers
    const closeReceiptModal = () => {
        document.getElementById('receipt-modal').classList.remove('active');
    };
    document.getElementById('btn-close-receipt').addEventListener('click', closeReceiptModal);
    document.getElementById('btn-done-receipt').addEventListener('click', closeReceiptModal);

    document.getElementById('btn-print-receipt').addEventListener('click', () => {
        const printContent = document.getElementById('printable-receipt').innerHTML;
        const printWindow = window.open('', '_blank');
        printWindow.document.write('<html><head><title>Print Receipt</title>');
        printWindow.document.write('<style>');
        printWindow.document.write('body { font-family: monospace; padding: 20px; color: #000; background: #fff; }');
        printWindow.document.write('.receipt-header { text-align: center; font-weight: bold; font-size: 16px; margin-bottom: 10px; }');
        printWindow.document.write('.receipt-divider { border-top: 1px dashed #000; margin: 10px 0; }');
        printWindow.document.write('.receipt-detail-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; }');
        printWindow.document.write('.receipt-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }');
        printWindow.document.write('.receipt-table th { border-bottom: 1px dashed #000; text-align: left; padding: 4px; }');
        printWindow.document.write('.receipt-table td { padding: 4px; }');
        printWindow.document.write('.receipt-summary { margin-top: 10px; font-size: 12px; }');
        printWindow.document.write('.receipt-summary-row { display: flex; justify-content: space-between; margin-bottom: 4px; }');
        printWindow.document.write('.receipt-summary-row.bold { font-weight: bold; border-top: 1px dashed #000; padding-top: 4px; }');
        printWindow.document.write('.receipt-footer { text-align: center; font-size: 10px; margin-top: 20px; }');
        printWindow.document.write('</style></head><body>');
        printWindow.document.write(printContent);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        
        // Wait briefly for content to render, then print and close tab
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    });


    // ----------------------------------------------------
    // 7. UDHAARI / DUES TRACKER LEDGER ENGINE
    // ----------------------------------------------------
    let udhaariSearchQuery = '';

    function renderUdhaariLedger() {
        const tbody = document.getElementById('udhaari-table-body');
        tbody.innerHTML = '';

        let totalOutstanding = 0;
        state.udhaari.forEach(u => totalOutstanding += u.pendingAmount);
        document.getElementById('udhaari-total-due').textContent = `₹${totalOutstanding.toLocaleString('en-IN')}`;

        const filtered = state.udhaari.filter(u => {
            const query = udhaariSearchQuery.toLowerCase();
            return u.customerName.toLowerCase().includes(query) || u.phone.includes(query);
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 30px; color: var(--text-muted);">No records found in Udhaari ledger.</td></tr>`;
            return;
        }

        filtered.forEach((cust, index) => {
            const globalIndex = state.udhaari.findIndex(u => u.phone === cust.phone);
            const dateStr = new Date(cust.lastActivity).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
            
            const rowHTML = `
                <tr>
                    <td style="font-weight: 600;">${cust.customerName}</td>
                    <td>${cust.phone}</td>
                    <td style="color: ${cust.pendingAmount > 0 ? 'var(--accent-rose)':'var(--accent-emerald)'}; font-weight:700;">₹${cust.pendingAmount.toLocaleString('en-IN')}</td>
                    <td>${dateStr}</td>
                    <td>
                        <div style="display: flex; gap: 8px; align-items:center;">
                            <button class="btn-secondary" style="padding: 4px 10px; font-size:11px;" onclick="manageUdhaariDues(${globalIndex})">
                                Manage
                            </button>
                            <button class="table-action-btn delete" onclick="deleteUdhaariEntry('${cust.phone}')" title="Delete record" style="width: 26px; height: 26px;">
                                <i data-lucide="x" style="width: 14px; height: 14px;"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', rowHTML);
        });

        if (state.selectedUdhaariCustomer === null) {
            document.getElementById('udhaari-selected-name').textContent = "No Customer Selected";
            document.getElementById('udhaari-selected-info').textContent = "Please select 'Manage' on any customer in the ledger table to register cash/online credit payments.";
            document.getElementById('udhaari-actions-block').innerHTML = '';
        }

        lucide.createIcons();
    }

    // Deletes customer outstanding credits records inside Udhaari tab (CRITICAL CROSS OPTION PURGE FEATURE!)
    window.deleteUdhaariEntry = function(phone) {
        const match = state.udhaari.find(u => u.phone === phone);
        if (!match) return;

        if (confirm(`Purge ledger? Are you sure you want to completely remove "${match.customerName}" from the Udhaari ledger? All outstanding dues of ₹${match.pendingAmount} will be wiped!`)) {
            state.udhaari = state.udhaari.filter(u => u.phone !== phone);
            saveUdhaari();
            
            // Clear active selection if it's the deleted user
            if (state.selectedUdhaariCustomer && state.selectedUdhaariCustomer.phone === phone) {
                state.selectedUdhaariCustomer = null;
            }

            renderUdhaariLedger();
            renderDashboardMetrics();
        }
    };

    document.getElementById('udhaari-search').addEventListener('input', (e) => {
        udhaariSearchQuery = e.target.value;
        renderUdhaariLedger();
    });

    window.manageUdhaariDues = function(globalIndex) {
        const cust = state.udhaari[globalIndex];
        state.selectedUdhaariCustomer = cust;

        document.getElementById('udhaari-selected-name').textContent = cust.customerName;
        
        const dateStr = new Date(cust.lastActivity).toLocaleString();
        document.getElementById('udhaari-selected-info').innerHTML = `
            Mobile: <strong>+91 ${cust.phone}</strong><br>
            Current Outstanding debt: <strong style="color: var(--accent-rose);">₹${cust.pendingAmount}</strong><br>
            Last activity log: <em>${dateStr}</em>
        `;

        const actionBlock = document.getElementById('udhaari-actions-block');
        actionBlock.innerHTML = `
            <button class="btn-primary" style="background: linear-gradient(135deg, var(--accent-emerald), #059669); border-color: var(--accent-emerald); justify-content:center; width: 100%;" onclick="triggerSettleDuesModal()">
                <i data-lucide="check-circle-2"></i> Record Udhaari Payment
            </button>
        `;

        lucide.createIcons();
    };

    window.triggerSettleDuesModal = function() {
        if (!state.selectedUdhaariCustomer) return;
        const cust = state.selectedUdhaariCustomer;
        
        if (cust.pendingAmount <= 0) {
            alert(`"${cust.customerName}" has ₹0 outstanding balance. Settle payment not required!`);
            return;
        }

        document.getElementById('settle-customer-name').textContent = cust.customerName;
        document.getElementById('settle-total-due').textContent = `₹${cust.pendingAmount}`;
        document.getElementById('settle-amount').value = '';
        
        document.getElementById('settle-modal').classList.add('active');
    };

    const closeSettleModal = () => {
        document.getElementById('settle-modal').classList.remove('active');
    };
    document.getElementById('btn-close-settle').addEventListener('click', closeSettleModal);
    document.getElementById('btn-cancel-settle').addEventListener('click', closeSettleModal);

    document.getElementById('btn-save-settle').addEventListener('click', () => {
        const amtInput = document.getElementById('settle-amount');
        const amt = parseFloat(amtInput.value);

        if (isNaN(amt) || amt <= 0) {
            alert("Please enter a valid payment amount received!");
            return;
        }

        const cust = state.selectedUdhaariCustomer;
        if (amt > cust.pendingAmount) {
            alert(`Received amount (₹${amt}) cannot exceed outstanding dues (₹${cust.pendingAmount})!`);
            return;
        }

        cust.pendingAmount -= amt;
        cust.lastActivity = new Date().toISOString();
        saveUdhaari();

        const invId = `PAY-${new Date().getFullYear()}-${10000 + state.transactions.length}`;
        const payMode = document.getElementById('settle-mode').value;
        const newTx = {
            id: invId,
            date: new Date().toISOString(),
            customerName: cust.customerName,
            customerPhone: cust.phone,
            subtotal: amt,
            cgst: 0,
            sgst: 0,
            total: amt,
            costTotal: 0,
            profit: amt, 
            paymentMethod: payMode,
            items: [{ name: `Udhaari Payment - Outstanding Settle`, qty: 1, price: amt, cost: 0 }]
        };

        state.transactions.push(newTx);
        saveTransactions();

        alert(`Udhaari Payment of ₹${amt} recorded successfully!`);
        
        closeSettleModal();
        state.selectedUdhaariCustomer = null; 
        
        renderUdhaariLedger();
        renderDashboardMetrics();
        renderSalesChart();
        renderRecentTransactions();
    });

    // ----------------------------------------------------
    // 8. INVENTORY TAB LOGIC (CRUD operations)
    // ----------------------------------------------------
    let inventorySearchQuery = '';
    let inventoryCategoryFilter = 'all';

    function renderInventoryTable() {
        const tbody = document.getElementById('inventory-table-body');
        tbody.innerHTML = '';
        
        const categories = [...new Set(state.products.map(p => p.category))];
        const filterSelect = document.getElementById('inventory-category-filter');
        filterSelect.innerHTML = '<option value="all">All Categories</option>';
        categories.forEach(cat => {
            filterSelect.insertAdjacentHTML('beforeend', `<option value="${cat}">${cat}</option>`);
        });
        filterSelect.value = inventoryCategoryFilter;

        const filtered = state.products.filter(p => {
            const matchesCat = (inventoryCategoryFilter === 'all' || p.category === inventoryCategoryFilter);
            const matchesSearch = p.name.toLowerCase().includes(inventorySearchQuery.toLowerCase()) || p.category.toLowerCase().includes(inventorySearchQuery.toLowerCase());
            return matchesCat && matchesSearch;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 30px; color: var(--text-muted);">No products found in inventory.</td></tr>`;
            return;
        }

        filtered.forEach((prod, index) => {
            const globalIndex = state.products.findIndex(p => p.name === prod.name);
            
            let stockBadge = '';
            if (prod.stock === 0) {
                stockBadge = `<span class="status-badge out-stock">Out of Stock (0)</span>`;
            } else if (prod.stock <= prod.minAlert) {
                stockBadge = `<span class="status-badge low-stock">Low Stock (${prod.stock})</span>`;
            } else {
                stockBadge = `<span class="status-badge in-stock">Healthy (${prod.stock})</span>`;
            }

            const rowHTML = `
                <tr>
                    <td style="font-weight: 600;">${prod.name}</td>
                    <td>${prod.category}</td>
                    <td>${stockBadge}</td>
                    <td>₹${prod.purchasePrice}</td>
                    <td style="color: var(--accent-saffron); font-weight:700;">₹${prod.sellingPrice}</td>
                    <td>${prod.minAlert}</td>
                    <td>
                        <div style="display:flex; gap:6px;">
                            <button class="table-action-btn edit" onclick="openProductModal(${globalIndex})">
                                <i data-lucide="pencil" style="width: 14px; height: 14px;"></i>
                            </button>
                            <button class="table-action-btn delete" onclick="deleteProduct(${globalIndex})">
                                <i data-lucide="trash" style="width: 14px; height: 14px;"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', rowHTML);
        });

        lucide.createIcons();
    }

    document.getElementById('inventory-search').addEventListener('input', (e) => {
        inventorySearchQuery = e.target.value;
        renderInventoryTable();
    });

    document.getElementById('inventory-category-filter').addEventListener('change', (e) => {
        inventoryCategoryFilter = e.target.value;
        renderInventoryTable();
    });

    const productModal = document.getElementById('product-modal');
    
    window.openProductModal = function(editIndex = -1) {
        const title = document.getElementById('product-modal-title');
        const formIndex = document.getElementById('product-edit-index');
        
        if (editIndex >= 0) {
            title.textContent = "Edit Product Details";
            formIndex.value = editIndex;
            
            const prod = state.products[editIndex];
            document.getElementById('prod-name').value = prod.name;
            document.getElementById('prod-category').value = prod.category;
            document.getElementById('prod-stock').value = prod.stock;
            document.getElementById('prod-purchase-price').value = prod.purchasePrice;
            document.getElementById('prod-selling-price').value = prod.sellingPrice;
            document.getElementById('prod-min-alert').value = prod.minAlert;
        } else {
            title.textContent = "Add New Product SKU";
            formIndex.value = '';
            document.getElementById('product-form').reset();
        }
        
        productModal.classList.add('active');
        lucide.createIcons();
    };

    document.getElementById('btn-add-product').addEventListener('click', () => {
        openProductModal(-1);
    });

    const closeProductModal = () => {
        productModal.classList.remove('active');
    };
    document.getElementById('btn-close-product').addEventListener('click', closeProductModal);
    document.getElementById('btn-cancel-product').addEventListener('click', closeProductModal);

    document.getElementById('btn-save-product').addEventListener('click', (e) => {
        e.preventDefault();
        
        const form = document.getElementById('product-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const editIndexStr = document.getElementById('product-edit-index').value;
        const name = document.getElementById('prod-name').value.trim();
        const category = document.getElementById('prod-category').value;
        const stock = parseInt(document.getElementById('prod-stock').value);
        const purchasePrice = parseFloat(document.getElementById('prod-purchase-price').value);
        const sellingPrice = parseFloat(document.getElementById('prod-selling-price').value);
        const minAlert = parseInt(document.getElementById('prod-min-alert').value);

        const productData = { name, category, stock, purchasePrice, sellingPrice, minAlert };

        if (editIndexStr !== '') {
            const idx = parseInt(editIndexStr);
            state.products[idx] = productData;
        } else {
            if (state.products.some(p => p.name.toLowerCase() === name.toLowerCase())) {
                alert("A product with this identical title already exists!");
                return;
            }
            state.products.push(productData);
        }

        saveProducts();
        closeProductModal();
        renderInventoryTable();
        
        // Dynamic dashboard updates!
        renderDashboardMetrics();
    });

    window.deleteProduct = function(index) {
        const prod = state.products[index];
        if (confirm(`Are you absolutely sure you want to delete product "${prod.name}" from your catalog?`)) {
            state.products.splice(index, 1);
            saveProducts();
            renderInventoryTable();
            
            // Dynamic dashboard updates!
            renderDashboardMetrics();
        }
    };

    // ----------------------------------------------------
    // 9. INITIALIZATION BOOTSTRAP
    // ----------------------------------------------------
    checkActiveSession();
});
