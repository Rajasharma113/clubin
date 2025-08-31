// Club!n Party Vibes System - Main User Portal
class ClubinApp {
    constructor() {
        this.apiBase = '/api';
        this.clubs = [];
        this.events = [];
        this.membershipTiers = [];
        this.userSession = {
            isLoggedIn: false,
            userData: null,
            token: localStorage.getItem('clubin_token'),
            membershipTier: 'Bronze',
            points: 0,
            visitCount: 0,
            favoriteClubs: []
        };
        this.currentSection = 'clubs';
        this.selectedClub = null;
        this.selectedEntryType = null;
        this.currentEntryFee = 0;
        this.init();
    }

    async init() {
        this.bindEvents();
        this.setupAgeVerification();
        this.setupEntryTypeHandlers();
        this.setupNavigation();
        this.setupContactForm();
        this.setupNewsletter();

        if (this.userSession.token) await this.checkAuthStatus();
        await this.loadClubs();
        await this.loadEvents();
        await this.loadMembershipTiers();
        this.showSection('home');

        console.log('🎉 Club!n Party Vibes System Ready!');
    }

    // Navigation for base sections
    setupNavigation() {
        document.querySelectorAll('.nav__link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const href = link.getAttribute('href');
                if (href.startsWith('#')) {
                    const sectionId = href.substring(1);
                    this.navigateToSection(sectionId);
                }
            });
        });
    }

    navigateToSection(sectionId) {
        if (['home', 'about', 'contact'].includes(sectionId) && this.userSession.isLoggedIn) {
            this.showSection(sectionId);
        } else if (sectionId === 'home') {
            this.showSection('home');
        } else if (sectionId === 'about') {
            this.showSection('about');
        } else if (sectionId === 'contact') {
            this.showSection('contact');
        }
    }

    // Contact form functionality
    setupContactForm() {
        const contactForm = document.getElementById('contactForm');
        if (contactForm) {
            contactForm.addEventListener('submit', (e) => this.handleContactForm(e));
        }
    }

    setupNewsletter() {
        const newsletterForm = document.getElementById('newsletterForm');
        if (newsletterForm) {
            newsletterForm.addEventListener('submit', (e) => this.handleNewsletter(e));
        }
    }

    async handleContactForm(e) {
        e.preventDefault();
        const formData = new FormData(e.target);

        const contactData = {
            name: formData.get('contactName'),
            email: formData.get('contactEmail'),
            phone: formData.get('contactPhone'),
            subject: formData.get('contactSubject'),
            message: formData.get('contactMessage')
        };

        try {
            const response = await this.apiCall('/contact', { 
                method: 'POST', 
                body: JSON.stringify(contactData) 
            });

            this.showSuccessModal('Message Sent! 🎉', response.message);
            e.target.reset();
        } catch (error) {
            this.showError('Failed to send message. Please try again.');
        }
    }

    async handleNewsletter(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const email = formData.get('newsletterEmail');

        try {
            const response = await this.apiCall('/newsletter', {
                method: 'POST',
                body: JSON.stringify({ email })
            });

            this.showSuccessModal('Welcome to the Party! 🎉', response.message);
            e.target.reset();
        } catch (error) {
            this.showError('Subscription failed. Please try again.');
        }
    }

    // API call method
    async apiCall(endpoint, options = {}) {
        const url = `${this.apiBase}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        if (this.userSession.token) {
            defaultOptions.headers['Authorization'] = `Bearer ${this.userSession.token}`;
        }

        const response = await fetch(url, { ...defaultOptions, ...options });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'API request failed');
        }

        return response.json();
    }

    // Authentication methods
    async checkAuthStatus() {
        try {
            const userData = await this.apiCall('/profile');
            Object.assign(this.userSession, {
                isLoggedIn: true,
                userData,
                points: userData.points,
                membershipTier: userData.membershipTier,
                visitCount: userData.visitCount,
                favoriteClubs: userData.favoriteClubs
            });
            this.updateUIForLoggedInUser();
        } catch (error) {
            console.error('Auth check failed:', error);
            this.logout();
        }
    }

    async loadClubs() {
        try {
            this.clubs = await this.apiCall('/clubs');
        } catch (error) {
            console.error('Failed to load clubs:', error);
            // Fallback data
            this.clubs = [
                {
                    id: 1, name: "Neon Nights", description: "Experience the ultimate nightlife with state-of-the-art sound systems and international DJs",
                    genre: "Electronic & Techno", capacity: "Available", entryFee: "₹750 for Members", regularFee: "₹1,500",
                    hours: "10 PM - 4 AM", waitTime: "No wait", image: "⚡", rating: 4.5
                },
                {
                    id: 2, name: "Sky Lounge", description: "Rooftop lounge with panoramic city views and premium dining experience",
                    genre: "House & Lounge", capacity: "Available", entryFee: "Free for Members", regularFee: "₹2,000",
                    hours: "9 PM - 3 AM", waitTime: "No wait", image: "🌆", rating: 4.3
                },
                {
                    id: 3, name: "Pulse Club", description: "The hottest spot in town with multiple dance floors and themed nights",
                    genre: "Hip-Hop & Bollywood", capacity: "Busy", entryFee: "₹900 for Members", regularFee: "₹1,800",
                    hours: "11 PM - 5 AM", waitTime: "15 min", image: "🎵", rating: 4.7
                }
            ];
        }
    }

    async loadEvents() {
        try {
            this.events = await this.apiCall('/events');
        } catch (error) {
            console.error('Failed to load events:', error);
            // Fallback data
            this.events = [
                {
                    id: 1, title: "Saturday Night Fever", date: "2025-08-30", time: "10 PM",
                    venue: "Neon Nights", description: "The ultimate Saturday night party with international DJs",
                    ticketPrice: "₹1,500", memberPrice: "₹1,200"
                },
                {
                    id: 2, title: "Rooftop Sunrise Session", date: "2025-08-31", time: "11 PM",
                    venue: "Sky Lounge", description: "Dance under the stars until sunrise at Mumbai's best rooftop",
                    ticketPrice: "₹2,000", memberPrice: "₹1,600"
                }
            ];
        }
    }

    async loadMembershipTiers() {
        try {
            this.membershipTiers = await this.apiCall('/membership/tiers');
        } catch (error) {
            console.error('Failed to load membership tiers:', error);
            // Fallback data
            this.membershipTiers = [
                { name: "Bronze", color: "#CD7F32", benefits: ["Skip regular lines", "10% off drinks"], pointsRequired: 0 },
                { name: "Silver", color: "#C0C0C0", benefits: ["Priority entry", "15% off drinks"], pointsRequired: 500 },
                { name: "Gold", color: "#FFD700", benefits: ["VIP entry", "20% off drinks"], pointsRequired: 1500 },
                { name: "Platinum", color: "#E5E4E2", benefits: ["Instant entry", "25% off everything"], pointsRequired: 3000 }
            ];
        }
    }

    // Event binding
    bindEvents() {
        document.getElementById('getStartedBtn').addEventListener('click', () => this.showAuthSection());
        document.getElementById('loginToggleBtn').addEventListener('click', () => this.showAuthSection());
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

        document.querySelectorAll('.auth__tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchAuthTab(e.target.dataset.tab));
        });

        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));

        document.querySelectorAll('.dash__tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchDashboardSection(e.target.dataset.section));
        });

        document.getElementById('closeBookingModal').addEventListener('click', () => this.hideModal('bookingModal'));
        document.getElementById('cancelBooking').addEventListener('click', () => this.hideModal('bookingModal'));
        document.getElementById('closeSuccessModal').addEventListener('click', () => this.hideModal('successModal'));
        document.getElementById('closeEmailConfirmModal').addEventListener('click', () => this.hideModal('emailConfirmModal'));
        document.getElementById('bookingForm').addEventListener('submit', (e) => this.handleBooking(e));

        document.getElementById('editProfileBtn').addEventListener('click', () => this.toggleProfileEdit(true));
        document.getElementById('cancelEditBtn').addEventListener('click', () => this.toggleProfileEdit(false));
        document.getElementById('profileEditForm').addEventListener('submit', (e) => this.handleProfileUpdate(e));

        document.querySelectorAll('.modal__backdrop').forEach(backdrop => {
            backdrop.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) this.hideModal(modal.id);
            });
        });
    }

    // Entry type handlers
    setupEntryTypeHandlers() {
        document.addEventListener('change', (e) => {
            if (e.target.name === 'entryType') {
                this.handleEntryTypeChange(e.target.value);
                this.updateSecondPersonField(e.target.value);
            }
        });
    }

    handleEntryTypeChange(entryType) {
        this.selectedEntryType = entryType;
        const selectedCard = document.querySelector('input[name="entryType"]:checked + .entry-type-card');
        const priceElement = selectedCard?.querySelector('.entry-type-price');
        const price = parseInt(priceElement?.dataset.price || '0');
        this.currentEntryFee = price;
        this.updateFeeDisplay();
    }

    updateSecondPersonField(entryType) {
        const secondPersonGroup = document.getElementById('secondPersonGroup');
        const secondNameInput = document.querySelector('input[name="secondName"]');

        if (entryType === 'couple' || entryType === 'table') {
            secondPersonGroup.style.display = 'block';
            secondNameInput.required = true;
        } else {
            secondPersonGroup.style.display = 'none';
            secondNameInput.required = false;
            secondNameInput.value = '';
        }
    }

    updateFeeDisplay() {
        const platformFee = 200;
        const subtotal = this.currentEntryFee + platformFee;
        const tax = Math.round(subtotal * 0.15);
        const total = subtotal + tax;

        document.getElementById('entryFeeDisplay').textContent = `₹${this.currentEntryFee}`;
        document.getElementById('taxDisplay').textContent = `₹${tax}`;
        document.getElementById('totalFeeDisplay').innerHTML = `<strong>₹${total}</strong>`;
    }

    setupAgeVerification() {
        const dobInput = document.getElementById('regDob');
        if (dobInput) {
            const maxDate = new Date();
            maxDate.setFullYear(maxDate.getFullYear() - 21);
            dobInput.max = maxDate.toISOString().split('T')[0];

            const minDate = new Date();
            minDate.setFullYear(minDate.getFullYear() - 100);
            dobInput.min = minDate.toISOString().split('T')[0];
        }
    }

    // Section management
    showSection(sectionId) {
        document.querySelectorAll('section').forEach(section => section.classList.add('hidden'));
        const targetSection = document.getElementById(sectionId);
        if (targetSection) targetSection.classList.remove('hidden');

        if (['home', 'about', 'contact'].includes(sectionId) || sectionId === 'auth') {
            document.getElementById('navLinks').classList.remove('hidden');
            document.getElementById('navUser').classList.add('hidden');
        }

        if (sectionId === 'dashboard' && this.userSession.isLoggedIn) {
            document.getElementById('navLinks').classList.add('hidden');
            document.getElementById('navUser').classList.remove('hidden');
        }
    }

    showAuthSection() {
        this.showSection('auth');
        this.switchAuthTab('login');
    }

    switchAuthTab(tab) {
        document.querySelectorAll('.auth__tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

        document.querySelectorAll('.auth__form').forEach(form => form.classList.add('hidden'));
        document.getElementById(`${tab}Form`).classList.remove('hidden');
    }

    // Authentication methods
    async handleLogin(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const email = formData.get('loginEmail');
        const password = formData.get('loginPassword');

        if (!email || !password) {
            this.showError('Please fill in all fields');
            return;
        }

        try {
            const response = await this.apiCall('/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });

            Object.assign(this.userSession, {
                token: response.token,
                isLoggedIn: true,
                userData: response.user,
                points: response.user.points,
                membershipTier: response.user.membershipTier,
                visitCount: response.user.visitCount,
                favoriteClubs: response.user.favoriteClubs
            });

            localStorage.setItem('clubin_token', response.token);
            this.loginSuccess();
        } catch (error) {
            this.showError(error.message);
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const formData = new FormData(e.target);

        const userData = {
            firstName: formData.get('regFirstName'),
            lastName: formData.get('regLastName'),
            email: formData.get('regEmail'),
            phone: formData.get('regPhone'),
            city: formData.get('regCity'),
            state: formData.get('regState'),
            dateOfBirth: formData.get('regDob'),
            password: formData.get('regPassword'),
            confirmPassword: formData.get('regConfirmPassword')
        };

        for (const [key, value] of Object.entries(userData)) {
            if (!value) {
                this.showError('Please fill in all required fields');
                return;
            }
        }

        if (userData.password !== userData.confirmPassword) {
            this.showError('Passwords do not match');
            return;
        }

        try {
            const response = await this.apiCall('/register', {
                method: 'POST',
                body: JSON.stringify(userData)
            });

            Object.assign(this.userSession, {
                token: response.token,
                isLoggedIn: true,
                userData: response.user,
                points: response.user.points,
                membershipTier: response.user.membershipTier,
                visitCount: response.user.visitCount,
                favoriteClubs: response.user.favoriteClubs
            });

            localStorage.setItem('clubin_token', response.token);
            this.loginSuccess();
        } catch (error) {
            this.showError(error.message);
        }
    }

    loginSuccess() {
        this.updateUIForLoggedInUser();
        this.showSection('dashboard');
        this.switchDashboardSection('clubs');
        this.showSuccessModal('Welcome to the Party! 🎉', 'Your account is ready. Start exploring clubs and making bookings!');
    }

    updateUIForLoggedInUser() {
        if (!this.userSession.userData?.firstName) return;

        document.getElementById('navLinks').classList.add('hidden');
        document.getElementById('navUser').classList.remove('hidden');

        const welcomeText = `Welcome, ${this.userSession.userData.firstName}!`;
        document.getElementById('userWelcome').textContent = welcomeText;
        document.getElementById('dashboardWelcome').textContent = welcomeText;
        document.getElementById('userPoints').textContent = this.userSession.points;
        document.getElementById('userTier').textContent = this.userSession.membershipTier;
        document.getElementById('userVisits').textContent = this.userSession.visitCount;

        this.populateProfile();
    }

    populateProfile() {
        const user = this.userSession.userData;
        if (!user) return;

        const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
        document.getElementById('avatarInitials').textContent = initials;
        document.getElementById('profileName').textContent = `${user.firstName} ${user.lastName}`;
        document.getElementById('profileEmail').textContent = user.email;
        document.getElementById('profileTier').textContent = `${this.userSession.membershipTier} Member`;
        document.getElementById('profileVisitsCount').textContent = this.userSession.visitCount;
        document.getElementById('profilePointsCount').textContent = this.userSession.points;
        document.getElementById('profileFavoritesCount').textContent = this.userSession.favoriteClubs.length;

        document.getElementById('viewFullName').textContent = `${user.firstName} ${user.lastName}`;
        document.getElementById('viewEmail').textContent = user.email;
        document.getElementById('viewPhone').textContent = user.phone;
        document.getElementById('viewLocation').textContent = `${user.city}, ${user.state}`;

        document.getElementById('editFirstName').value = user.firstName;
        document.getElementById('editLastName').value = user.lastName;
        document.getElementById('editEmail').value = user.email;
        document.getElementById('editPhone').value = user.phone;
        document.getElementById('editCity').value = user.city;
        document.getElementById('editState').value = user.state;
    }

    toggleProfileEdit(isEditing) {
        const viewSection = document.getElementById('profileView');
        const editSection = document.getElementById('profileEdit');
        const editButton = document.getElementById('editProfileBtn');

        if (isEditing) {
            viewSection.classList.add('hidden');
            editSection.classList.remove('hidden');
            editButton.textContent = 'Cancel';
        } else {
            viewSection.classList.remove('hidden');
            editSection.classList.add('hidden');
            editButton.textContent = 'Edit Profile';
        }
    }

    async handleProfileUpdate(e) {
        e.preventDefault();
        const formData = new FormData(e.target);

        const updateData = {
            firstName: formData.get('editFirstName'),
            lastName: formData.get('editLastName'),
            email: formData.get('editEmail'),
            phone: formData.get('editPhone'),
            city: formData.get('editCity'),
            state: formData.get('editState')
        };

        try {
            const response = await this.apiCall('/profile', {
                method: 'PUT',
                body: JSON.stringify(updateData)
            });

            this.userSession.userData = { ...this.userSession.userData, ...updateData };
            this.populateProfile();
            this.toggleProfileEdit(false);
            this.updateUIForLoggedInUser();
            this.showSuccessModal('Profile Updated! 🎉', 'Your profile has been updated successfully!');
        } catch (error) {
            this.showError(error.message);
        }
    }

    logout() {
        this.userSession = {
            isLoggedIn: false,
            userData: null,
            token: null,
            membershipTier: 'Bronze',
            points: 0,
            visitCount: 0,
            favoriteClubs: []
        };

        localStorage.removeItem('clubin_token');

        document.getElementById('navLinks').classList.remove('hidden');
        document.getElementById('navUser').classList.add('hidden');
        this.showSection('home');
    }

    switchDashboardSection(section) {
        this.currentSection = section;

        document.querySelectorAll('.dash__tab').forEach(tab => tab.classList.remove('active'));
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        this.showSection('dashboard');

        ['clubs', 'events', 'rewards', 'profile'].forEach(s => {
            document.getElementById(s).classList.add('hidden');
        });

        document.getElementById(section).classList.remove('hidden');

        switch(section) {
            case 'clubs':
                this.populateClubs();
                break;
            case 'events':
                this.populateEvents();
                break;
            case 'rewards':
                this.populateRewards();
                break;
            case 'profile':
                this.populateProfile();
                break;
        }
    }

    populateClubs() {
        const clubsGrid = document.getElementById('clubsGrid');
        clubsGrid.innerHTML = '';

        this.clubs.forEach(club => {
            const clubCard = document.createElement('div');
            clubCard.className = 'club__card';

            const capacityClass = club.capacity.toLowerCase().replace(' ', '');
            const isAvailable = club.capacity !== 'Full';

            clubCard.innerHTML = `
                <div class="club__header">
                    <div>
                        <div class="club__icon">${club.image}</div>
                        <h3 class="club__name">${club.name}</h3>
                        <div class="club__genre">${club.genre}</div>
                    </div>
                    <div class="club__capacity ${capacityClass}">${club.capacity}</div>
                </div>
                <div style="display: flex; align-items: center; margin: 12px 0; color: var(--color-warning);">
                    ${'⭐'.repeat(Math.floor(club.rating || 4.5))} 
                    <span style="margin-left: 8px; font-weight: 600;">${club.rating || 4.5}</span>
                </div>
                <p class="club__description">${club.description}</p>
                <div class="club__details">
                    <div class="club__detail">
                        <span class="club__detail-label">Entry Fee</span>
                        <span class="club__detail-value">${club.entryFee}</span>
                    </div>
                    <div class="club__detail">
                        <span class="club__detail-label">Regular Fee</span>
                        <span class="club__detail-value">${club.regularFee}</span>
                    </div>
                    <div class="club__detail">
                        <span class="club__detail-label">Hours</span>
                        <span class="club__detail-value">${club.hours}</span>
                    </div>
                    <div class="club__detail">
                        <span class="club__detail-label">Wait Time</span>
                        <span class="club__detail-value">${club.waitTime}</span>
                    </div>
                </div>
                <div class="club__actions">
                    <button class="btn btn--primary club__book-btn" onclick="app.showBookingModal(${club.id})" ${!isAvailable ? 'disabled' : ''}>
                        ${isAvailable ? '🎉 Book Entry' : 'Full - Join Waitlist'}
                    </button>
                    <button class="btn btn--outline" onclick="app.addToFavorites(${club.id})">♡ Favorite</button>
                </div>
            `;

            clubsGrid.appendChild(clubCard);
        });
    }

    populateEvents() {
        const eventsGrid = document.getElementById('eventsGrid');
        eventsGrid.innerHTML = '';

        this.events.forEach(event => {
            const eventCard = document.createElement('div');
            eventCard.className = 'event__card';

            const eventDate = new Date(event.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            eventCard.innerHTML = `
                <div class="event__date">${eventDate} • ${event.time}</div>
                <h3 class="event__title">🎉 ${event.title}</h3>
                <p class="event__venue">📍 ${event.venue}</p>
                <p class="event__description">${event.description}</p>
                <div class="event__pricing">
                    <div class="event__price">Regular: ${event.ticketPrice}</div>
                    <div class="event__member-price">Members: ${event.memberPrice}</div>
                </div>
                <button class="btn btn--primary" onclick="app.bookEvent(${event.id})">🎫 Book Tickets</button>
            `;

            eventsGrid.appendChild(eventCard);
        });
    }

    populateRewards() {
        const rewardsGrid = document.getElementById('rewardsGrid');
        rewardsGrid.innerHTML = '';

        this.membershipTiers.forEach((tier) => {
            const tierCard = document.createElement('div');
            tierCard.className = 'tier__card';

            const isCurrentTier = tier.name === this.userSession.membershipTier;
            if (isCurrentTier) {
                tierCard.style.border = `2px solid ${tier.color}`;
                tierCard.style.boxShadow = `0 0 30px ${tier.color}40`;
            }

            tierCard.innerHTML = `
                <h3 class="tier__name" style="color: ${tier.color}">${tier.name}</h3>
                <p class="tier__points">${tier.pointsRequired === 0 ? 'Starting Tier' : `${tier.pointsRequired} points required`}</p>
                <ul class="tier__benefits">
                    ${tier.benefits.map(benefit => `<li class="tier__benefit">✓ ${benefit}</li>`).join('')}
                </ul>
                ${isCurrentTier ? '<div class="status status--success">🏆 Current Tier</div>' : ''}
            `;

            rewardsGrid.appendChild(tierCard);
        });
    }

    showBookingModal(clubId) {
        this.selectedClub = this.clubs.find(c => c.id === clubId);
        if (!this.selectedClub) return;

        document.getElementById('bookingClubName').textContent = this.selectedClub.name;
        document.getElementById('bookingGenre').textContent = this.selectedClub.genre;

        document.getElementById('bookingForm').reset();
        this.currentEntryFee = 0;
        this.updateFeeDisplay();
        this.updateSecondPersonField('');

        this.showModal('bookingModal');
    }

    async handleBooking(e) {
        e.preventDefault();
        const formData = new FormData(e.target);

        if (!this.selectedEntryType) {
            this.showError('Please select an entry type');
            return;
        }

        const bookingData = {
            clubId: this.selectedClub.id,
            entryType: formData.get('entryType'),
            firstName: formData.get('firstName'),
            secondName: formData.get('secondName') || null,
            bookingDate: formData.get('bookingDate'),
            bookingTime: formData.get('bookingTime'),
            entryFee: this.currentEntryFee,
            platformFee: 200,
            totalFee: this.currentEntryFee + 200 + Math.round((this.currentEntryFee + 200) * 0.15),
            specialRequests: formData.get('specialRequests') || ''
        };

        try {
            const response = await this.apiCall('/bookings', {
                method: 'POST',
                body: JSON.stringify(bookingData)
            });

            this.userSession.points += response.pointsEarned || 50;
            this.userSession.visitCount += 1;

            await this.checkAuthStatus();
            this.updateUIForLoggedInUser();

            this.hideModal('bookingModal');
            this.showModal('emailConfirmModal');

            e.target.reset();
            this.selectedEntryType = null;
            this.currentEntryFee = 0;
        } catch (error) {
            this.showError(error.message);
        }
    }

    async addToFavorites(clubId) {
        try {
            await this.apiCall('/users/favorites', {
                method: 'POST',
                body: JSON.stringify({ clubId })
            });
            this.showSuccessModal('Added to Favorites! ❤️', 'This club has been added to your favorites list.');
        } catch (error) {
            this.showError(error.message);
        }
    }

    bookEvent(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (event) {
            this.showSuccessModal('Event Booking 🎫', `Event booking for "${event.title}" is coming soon! You'll be notified when tickets are available.`);
        }
    }

    showModal(modalId) {
        document.getElementById(modalId).classList.remove('hidden');
    }

    hideModal(modalId) {
        document.getElementById(modalId).classList.add('hidden');
    }

    showSuccessModal(title, message) {
        document.querySelector('#successModal h3').textContent = title;
        document.querySelector('#successModal p').textContent = message;
        this.showModal('successModal');
    }

    showError(message) {
        alert(message);
        console.error(message);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ClubinApp();
    console.log('🎉 Club!n Party Vibes System Loaded!');
});
