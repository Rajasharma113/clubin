// Club Owner Portal - Working Version
class ClubOwnerApp {
    constructor() {
        this.apiBase = '/api/owner';
        this.generalApi = '/api';
        this.ownerSession = {
            isLoggedIn: false,
            token: localStorage.getItem('clubin_owner_token'),
            ownerData: null,
            clubData: null,
            stats: { totalBookings: 0, totalEvents: 0, totalAttendance: 0 },
            bookings: [],
            events: [],
            attendance: []
        };
        this.currentSection = 'ownerOverview';
        this.init();
    }

    async init() {
        this.bindEvents();
        if (this.ownerSession.token) {
            await this.checkOwnerAuth();
        } else {
            this.showSection('ownerAuth');
        }
        console.log('🏢 Club Owner Portal Ready!');
    }

    bindEvents() {
        // Auth form events
        document.getElementById('ownerLoginBtn').addEventListener('click', () => this.showSection('ownerAuth'));
        document.getElementById('ownerLogoutBtn').addEventListener('click', () => this.ownerLogout());

        // Auth tabs
        document.querySelectorAll('.auth__tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchOwnerAuthTab(e.target.dataset.tab));
        });

        // Auth forms
        document.getElementById('ownerLoginForm').addEventListener('submit', (e) => this.handleOwnerLogin(e));
        document.getElementById('ownerRegisterForm').addEventListener('submit', (e) => this.handleOwnerRegister(e));

        // Dashboard tabs
        document.querySelectorAll('.owner-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchOwnerSection(e.target.dataset.section));
        });

        // Event management
        document.getElementById('createEventBtn').addEventListener('click', () => this.showModal('createEventModal'));
        document.getElementById('createEventForm').addEventListener('submit', (e) => this.handleCreateEvent(e));
        document.getElementById('closeEventModal').addEventListener('click', () => this.hideModal('createEventModal'));
        document.getElementById('cancelEvent').addEventListener('click', () => this.hideModal('createEventModal'));

        // Settings form
        document.getElementById('clubSettingsForm').addEventListener('submit', (e) => this.handleUpdateSettings(e));

        // Modals
        document.getElementById('closeOwnerSuccessModal').addEventListener('click', () => this.hideModal('ownerSuccessModal'));

        // Backdrop clicks
        document.querySelectorAll('.modal__backdrop').forEach(backdrop => {
            backdrop.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) this.hideModal(modal.id);
            });
        });
    }

    // API Methods
    async ownerApiCall(endpoint, options = {}) {
        const url = endpoint.startsWith('/api') ? endpoint : `${this.apiBase}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        if (this.ownerSession.token) {
            defaultOptions.headers['Authorization'] = `Bearer ${this.ownerSession.token}`;
        }

        try {
            const response = await fetch(url, { ...defaultOptions, ...options });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Request failed' }));
                throw new Error(error.error || `HTTP ${response.status}`);
            }

            return response.json();
        } catch (error) {
            console.error('Owner API Error:', error);
            throw error;
        }
    }

    // Authentication
    async checkOwnerAuth() {
        try {
            const dashboardData = await this.ownerApiCall('/dashboard');
            this.ownerSession.isLoggedIn = true;
            this.ownerSession.clubData = dashboardData.club;
            this.ownerSession.stats = dashboardData.stats;
            this.ownerSession.bookings = dashboardData.bookings || [];
            this.ownerSession.events = dashboardData.events || [];
            this.ownerSession.attendance = dashboardData.attendance || [];

            this.updateOwnerUI();
            this.showSection('ownerDashboard');
            this.switchOwnerSection('ownerOverview');
        } catch (error) {
            console.error('Owner auth check failed:', error);
            this.ownerLogout();
        }
    }

    async handleOwnerLogin(e) {
        e.preventDefault();
        const formData = new FormData(e.target);

        const loginData = {
            email: formData.get('ownerEmail'),
            password: formData.get('ownerPassword')
        };

        try {
            const response = await this.ownerApiCall('/login', {
                method: 'POST',
                body: JSON.stringify(loginData)
            });

            this.ownerSession.token = response.token;
            this.ownerSession.ownerData = response.owner;
            this.ownerSession.clubData = response.club;
            localStorage.setItem('clubin_owner_token', response.token);

            await this.checkOwnerAuth();
            this.showOwnerSuccess('Welcome Back!', 'Successfully logged into your club dashboard.');
        } catch (error) {
            this.showError(error.message || 'Login failed');
        }
    }

    async handleOwnerRegister(e) {
        e.preventDefault();
        const formData = new FormData(e.target);

        const password = formData.get('ownerRegPassword');
        const confirmPassword = formData.get('ownerConfirmPassword');

        if (password !== confirmPassword) {
            this.showError('Passwords do not match');
            return;
        }

        const registerData = {
            clubName: formData.get('clubName'),
            ownerName: formData.get('ownerName'),
            email: formData.get('ownerRegEmail'),
            phone: formData.get('ownerPhone'),
            address: formData.get('clubAddress'),
            password: password
        };

        try {
            const response = await this.ownerApiCall('/register', {
                method: 'POST',
                body: JSON.stringify(registerData)
            });

            this.ownerSession.token = response.token;
            this.ownerSession.ownerData = response.owner;
            this.ownerSession.clubData = response.club;
            localStorage.setItem('clubin_owner_token', response.token);

            await this.checkOwnerAuth();
            this.showOwnerSuccess('Club Registered!', 'Your club has been successfully registered. Welcome to Club!n!');
        } catch (error) {
            this.showError(error.message || 'Registration failed');
        }
    }

    ownerLogout() {
        this.ownerSession = {
            isLoggedIn: false,
            token: null,
            ownerData: null,
            clubData: null,
            stats: { totalBookings: 0, totalEvents: 0, totalAttendance: 0 },
            bookings: [],
            events: [],
            attendance: []
        };
        localStorage.removeItem('clubin_owner_token');

        document.getElementById('ownerNavLinks').classList.remove('hidden');
        document.getElementById('ownerNavUser').classList.add('hidden');
        this.showSection('ownerAuth');
    }

    // UI Management
    showSection(sectionId) {
        document.querySelectorAll('section').forEach(section => section.classList.add('hidden'));
        const targetSection = document.getElementById(sectionId);
        if (targetSection) targetSection.classList.remove('hidden');
    }

    switchOwnerAuthTab(tab) {
        document.querySelectorAll('.auth__tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

        document.querySelectorAll('.auth__form').forEach(form => form.classList.add('hidden'));
        const targetForm = tab === 'ownerLogin' ? 'ownerLoginForm' : 'ownerRegisterForm';
        document.getElementById(targetForm).classList.remove('hidden');
    }

    switchOwnerSection(section) {
        this.currentSection = section;

        // Update active tab
        document.querySelectorAll('.owner-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        // Hide all sections
        ['ownerOverview', 'ownerBookings', 'ownerAttendance', 'ownerEvents', 'ownerSettings'].forEach(s => {
            document.getElementById(s).classList.add('hidden');
        });

        // Show target section
        document.getElementById(section).classList.remove('hidden');

        // Load section data
        switch(section) {
            case 'ownerOverview':
                this.populateOverview();
                break;
            case 'ownerBookings':
                this.populateBookings();
                break;
            case 'ownerAttendance':
                this.populateAttendance();
                break;
            case 'ownerEvents':
                this.populateEvents();
                break;
            case 'ownerSettings':
                this.populateSettings();
                break;
        }
    }

    updateOwnerUI() {
        if (!this.ownerSession.isLoggedIn || !this.ownerSession.clubData) return;

        document.getElementById('ownerNavLinks').classList.add('hidden');
        document.getElementById('ownerNavUser').classList.remove('hidden');

        const clubName = this.ownerSession.clubData.name || 'Your Club';
        document.getElementById('ownerWelcome').textContent = `Welcome, ${clubName}!`;
        document.getElementById('ownerDashboardTitle').textContent = `${clubName} Dashboard`;

        // Update stats
        document.getElementById('totalBookings').textContent = this.ownerSession.stats.totalBookings || 0;
        document.getElementById('totalEvents').textContent = this.ownerSession.stats.totalEvents || 0;
        document.getElementById('totalAttendance').textContent = this.ownerSession.stats.totalAttendance || 0;
        document.getElementById('activeBookings').textContent = this.ownerSession.bookings.length || 0;
    }

    // Data Population Methods
    populateOverview() {
        const club = this.ownerSession.clubData;
        const owner = this.ownerSession.ownerData;

        if (club) {
            document.getElementById('clubNameDisplay').textContent = `Club Name: ${club.name}`;
            document.getElementById('clubAddressDisplay').textContent = `Address: ${owner?.address || 'Not set'}`;
            document.getElementById('ownerNameDisplay').textContent = `Owner: ${owner?.ownerName || owner?.name || 'Not set'}`;
        }

        // Recent activity
        const recentActivity = document.getElementById('recentActivity');
        const recentBookings = this.ownerSession.bookings.slice(0, 3);

        if (recentBookings.length > 0) {
            recentActivity.innerHTML = recentBookings.map(booking => 
                `<p style="margin-bottom: 8px;">📅 ${booking.firstName} booked ${booking.entryType} entry</p>`
            ).join('');
        } else {
            recentActivity.innerHTML = '<p>No recent bookings</p>';
        }
    }

    populateBookings() {
        const bookingsTable = document.getElementById('bookingsTable');

        if (this.ownerSession.bookings.length === 0) {
            bookingsTable.innerHTML = '<p style="color: var(--color-text-secondary);">No bookings found</p>';
            return;
        }

        const tableHTML = `
            <table class="bookings-table">
                <thead>
                    <tr>
                        <th>Booking ID</th>
                        <th>Customer Name</th>
                        <th>Entry Type</th>
                        <th>Date & Time</th>
                        <th>Amount</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.ownerSession.bookings.map(booking => `
                        <tr>
                            <td>#${booking.id}</td>
                            <td>${booking.firstName} ${booking.secondName ? '+ ' + booking.secondName : ''}</td>
                            <td>${this.capitalizeFirst(booking.entryType)}</td>
                            <td>${this.formatDate(booking.bookingDate)} ${booking.bookingTime}</td>
                            <td>₹${booking.totalFee}</td>
                            <td><span class="status-badge status-confirmed">Confirmed</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        bookingsTable.innerHTML = tableHTML;
    }

    populateAttendance() {
        const attendanceTable = document.getElementById('attendanceTable');

        if (this.ownerSession.attendance.length === 0) {
            attendanceTable.innerHTML = `
                <p style="color: var(--color-text-secondary); margin-bottom: 24px;">No attendance records found</p>
                <div style="background: rgba(139, 92, 246, 0.1); padding: 20px; border-radius: 12px; border: 1px solid rgba(139, 92, 246, 0.2);">
                    <h4 style="color: var(--color-primary); margin-bottom: 16px;">How Attendance Works</h4>
                    <p style="color: var(--color-text-secondary); margin-bottom: 12px;">1. Customers book entries through the Club!n app</p>
                    <p style="color: var(--color-text-secondary); margin-bottom: 12px;">2. They receive QR codes for entry verification</p>
                    <p style="color: var(--color-text-secondary);">3. Use check-in/check-out buttons to track attendance</p>
                </div>
            `;
            return;
        }

        const tableHTML = `
            <table class="bookings-table">
                <thead>
                    <tr>
                        <th>Booking ID</th>
                        <th>Customer</th>
                        <th>Entry Type</th>
                        <th>Booking Date</th>
                        <th>Check-in Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.ownerSession.attendance.map(record => `
                        <tr>
                            <td>#${record.bookingId}</td>
                            <td>${record.userName || 'Unknown'}</td>
                            <td>${this.capitalizeFirst(record.entryType)}</td>
                            <td>${this.formatDate(record.bookingDate)}</td>
                            <td>
                                ${record.checkedIn ? 
                                    `<span class="status-badge status-checkedin">Checked In</span>` : 
                                    `<span class="status-badge">Pending</span>`
                                }
                            </td>
                            <td>
                                <div class="action-buttons">
                                    ${!record.checkedIn ? 
                                        `<button class="btn btn--primary btn-small" onclick="ownerApp.checkInUser(${record.bookingId})">Check In</button>` : 
                                        record.checkedOut ? 
                                            `<span style="color: var(--color-success);">✓ Completed</span>` :
                                            `<button class="btn btn--outline btn-small" onclick="ownerApp.checkOutUser(${record.bookingId})">Check Out</button>`
                                    }
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        attendanceTable.innerHTML = tableHTML;
    }

    populateEvents() {
        const eventsTable = document.getElementById('eventsTable');

        if (this.ownerSession.events.length === 0) {
            eventsTable.innerHTML = '<p style="color: var(--color-text-secondary);">No events created yet. Create your first event!</p>';
            return;
        }

        const tableHTML = `
            <table class="bookings-table">
                <thead>
                    <tr>
                        <th>Event Title</th>
                        <th>Date & Time</th>
                        <th>Venue</th>
                        <th>Ticket Price</th>
                        <th>Member Price</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.ownerSession.events.map(event => `
                        <tr>
                            <td>${event.title}</td>
                            <td>${this.formatDate(event.date)} ${event.time}</td>
                            <td>${event.venue}</td>
                            <td>₹${event.ticketPrice}</td>
                            <td>₹${event.memberPrice || event.ticketPrice}</td>
                            <td><span class="status-badge status-confirmed">Active</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        eventsTable.innerHTML = tableHTML;
    }

    populateSettings() {
        const club = this.ownerSession.clubData;
        const owner = this.ownerSession.ownerData;

        if (club && owner) {
            document.getElementById('settingsClubName').value = club.name || '';
            document.getElementById('settingsGenre').value = club.genre || '';
            document.getElementById('settingsCapacity').value = club.maxCapacity || '';
            document.getElementById('settingsFee').value = club.regularFee ? club.regularFee.replace('₹', '').replace(',', '') : '';
            document.getElementById('settingsHours').value = club.hours || '';
            document.getElementById('settingsPhone').value = owner.phone || '';
            document.getElementById('settingsDescription').value = club.description || '';
        }
    }

    // Event Management
    async handleCreateEvent(e) {
        e.preventDefault();
        const formData = new FormData(e.target);

        const eventData = {
            title: formData.get('eventTitle'),
            date: formData.get('eventDate'),
            time: formData.get('eventTime'),
            description: formData.get('eventDescription'),
            ticketPrice: formData.get('ticketPrice'),
            memberPrice: formData.get('memberPrice') || formData.get('ticketPrice')
        };

        try {
            const response = await this.ownerApiCall('/events', {
                method: 'POST',
                body: JSON.stringify(eventData)
            });

            this.ownerSession.events.push(response.event);
            this.hideModal('createEventModal');
            this.populateEvents();
            this.showOwnerSuccess('Event Created!', 'Your event has been successfully created and is now live.');
            e.target.reset();
        } catch (error) {
            this.showError(error.message || 'Failed to create event');
        }
    }

    async handleUpdateSettings(e) {
        e.preventDefault();
        const formData = new FormData(e.target);

        const settingsData = {
            name: formData.get('settingsClubName'),
            genre: formData.get('settingsGenre'),
            maxCapacity: formData.get('settingsCapacity'),
            regularFee: '₹' + formData.get('settingsFee'),
            hours: formData.get('settingsHours'),
            phone: formData.get('settingsPhone'),
            description: formData.get('settingsDescription')
        };

        try {
            const response = await this.ownerApiCall('/club', {
                method: 'PUT',
                body: JSON.stringify(settingsData)
            });

            this.ownerSession.clubData = { ...this.ownerSession.clubData, ...response.club };
            this.updateOwnerUI();
            this.showOwnerSuccess('Settings Updated!', 'Your club settings have been successfully updated.');
        } catch (error) {
            this.showError(error.message || 'Failed to update settings');
        }
    }

    // Attendance Management
    async checkInUser(bookingId) {
        try {
            await this.ownerApiCall('/attendance/checkin', {
                method: 'POST',
                body: JSON.stringify({ bookingId })
            });

            // Update attendance record
            const record = this.ownerSession.attendance.find(a => a.bookingId === bookingId);
            if (record) {
                record.checkedIn = true;
                record.checkInTime = new Date().toISOString();
            }

            this.populateAttendance();
            this.showOwnerSuccess('Check-in Successful!', 'Customer has been checked in successfully.');
        } catch (error) {
            this.showError(error.message || 'Check-in failed');
        }
    }

    async checkOutUser(bookingId) {
        try {
            await this.ownerApiCall('/attendance/checkout', {
                method: 'POST',
                body: JSON.stringify({ bookingId })
            });

            // Update attendance record
            const record = this.ownerSession.attendance.find(a => a.bookingId === bookingId);
            if (record) {
                record.checkedOut = true;
                record.checkOutTime = new Date().toISOString();
            }

            this.populateAttendance();
            this.showOwnerSuccess('Check-out Successful!', 'Customer has been checked out successfully.');
        } catch (error) {
            this.showError(error.message || 'Check-out failed');
        }
    }

    // Utility Methods
    showModal(modalId) {
        document.getElementById(modalId).classList.remove('hidden');
    }

    hideModal(modalId) {
        document.getElementById(modalId).classList.add('hidden');
    }

    showOwnerSuccess(title, message) {
        document.getElementById('ownerSuccessTitle').textContent = title;
        document.getElementById('ownerSuccessMessage').textContent = message;
        this.showModal('ownerSuccessModal');
    }

    showError(message) {
        alert(message);
        console.error(message);
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }
}

// Initialize owner app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.ownerApp = new ClubOwnerApp();
    console.log('🏢 Club Owner Portal Loaded!');
    console.log('✨ Full dashboard functionality with backend integration');
});
