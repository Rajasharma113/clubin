const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'clubin_party_vibes_secret';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Data storage (in production, use a proper database)
let users = [];
let clubOwners = [];
let bookings = [];
let events = [];
let attendance = [];

const clubs = [
    {
        id: 1, name: "Neon Nights", description: "Experience the ultimate nightlife with state-of-the-art sound systems and international DJs",
        genre: "Electronic & Techno", capacity: "Available", entryFee: "₹750 for Members", regularFee: "₹1,500",
        hours: "10 PM - 4 AM", waitTime: "No wait", image: "⚡", rating: 4.5, currentPeople: 500, maxCapacity: 800
    },
    {
        id: 2, name: "Sky Lounge", description: "Rooftop lounge with panoramic city views and premium dining experience",
        genre: "House & Lounge", capacity: "Available", entryFee: "Free for Members", regularFee: "₹2,000",
        hours: "9 PM - 3 AM", waitTime: "No wait", image: "🌆", rating: 4.3, currentPeople: 300, maxCapacity: 450
    },
    {
        id: 3, name: "Pulse Club", description: "The hottest spot in town with multiple dance floors and themed nights",
        genre: "Hip-Hop & Bollywood", capacity: "Busy", entryFee: "₹900 for Members", regularFee: "₹1,800",
        hours: "11 PM - 5 AM", waitTime: "15 min", image: "🎵", rating: 4.7, currentPeople: 700, maxCapacity: 800
    }
];

const membershipTiers = [
    { name: "Bronze", color: "#CD7F32", benefits: ["Skip regular lines", "10% off drinks"], pointsRequired: 0 },
    { name: "Silver", color: "#C0C0C0", benefits: ["Priority entry", "15% off drinks"], pointsRequired: 500 },
    { name: "Gold", color: "#FFD700", benefits: ["VIP entry", "20% off drinks"], pointsRequired: 1500 },
    { name: "Platinum", color: "#E5E4E2", benefits: ["Instant entry", "25% off everything"], pointsRequired: 3000 }
];

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access token required' });
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

const authenticateOwner = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Owner access token required' });
    jwt.verify(token, JWT_SECRET, (err, owner) => {
        if (err) return res.status(403).json({ error: 'Invalid owner token' });
        if (!owner.isOwner) return res.status(403).json({ error: 'Owner access required' });
        req.owner = owner;
        next();
    });
};

const calculateUserTier = (points) => {
    if (points >= 3000) return 'Platinum';
    if (points >= 1500) return 'Gold';
    if (points >= 500) return 'Silver';
    return 'Bronze';
};

// Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/owner', (req, res) => res.sendFile(path.join(__dirname, 'public', 'owner', 'index.html')));
app.get('/privacy', (req, res) => res.sendFile(path.join(__dirname, 'public', 'privacy.html')));
app.get('/terms', (req, res) => res.sendFile(path.join(__dirname, 'public', 'terms.html')));

// Contact form endpoint
app.post('/api/contact', (req, res) => {
    const { name, email, phone, subject, message } = req.body;
    console.log('Contact form submission:', { name, email, subject });
    res.json({ message: 'Thank you for contacting us! We will get back to you within 24 hours.' });
});

// Newsletter endpoint
app.post('/api/newsletter', (req, res) => {
    const { email } = req.body;
    console.log('Newsletter subscription:', email);
    res.json({ message: 'Successfully subscribed to our newsletter!' });
});

// User authentication
app.post('/api/register', async (req, res) => {
    try {
        const { firstName, lastName, email, phone, city, state, dateOfBirth, password } = req.body;

        if (!firstName || !lastName || !email || !phone || !city || !state || !dateOfBirth || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const dobDate = new Date(dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - dobDate.getFullYear();
        const monthDiff = today.getMonth() - dobDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) {
            age--;
        }

        if (age < 21) {
            return res.status(400).json({ error: 'You must be at least 21 years old' });
        }

        if (users.find(u => u.email === email)) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            id: users.length + 1, firstName, lastName, email, phone, city, state, dateOfBirth,
            password: hashedPassword, points: 0, visitCount: 0, membershipTier: 'Bronze',
            favoriteClubs: [], createdAt: new Date().toISOString()
        };
        users.push(newUser);

        const token = jwt.sign({ userId: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '24h' });
        const { password: _, ...userWithoutPassword } = newUser;
        res.status(201).json({ message: 'Registration successful', token, user: userWithoutPassword });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

        const user = users.find(u => u.email === email);
        if (!user || !await bcrypt.compare(password, user.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
        const { password: _, ...userWithoutPassword } = user;
        res.json({ message: 'Login successful', token, user: userWithoutPassword });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Owner authentication
app.post('/api/owner/register', async (req, res) => {
    try {
        const { clubName, ownerName, email, phone, address, password } = req.body;

        if (!clubName || !ownerName || !email || !phone || !address || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (clubOwners.find(o => o.email === email)) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newOwner = {
            id: clubOwners.length + 1, clubName, ownerName, email, phone, address,
            password: hashedPassword, isVerified: false, createdAt: new Date().toISOString()
        };
        clubOwners.push(newOwner);

        const newClub = {
            id: clubs.length + 1, ownerId: newOwner.id, name: clubName,
            description: "New nightclub experience", genre: "Mixed", capacity: "Available",
            entryFee: "TBD", regularFee: "₹1,500", hours: "9 PM - 3 AM", waitTime: "No wait", image: "🎭", rating: 4.0
        };
        clubs.push(newClub);

        const token = jwt.sign({ ownerId: newOwner.id, email: newOwner.email, clubId: newClub.id, isOwner: true }, JWT_SECRET, { expiresIn: '24h' });
        const { password: _, ...ownerWithoutPassword } = newOwner;
        res.status(201).json({ message: 'Owner registration successful', token, owner: ownerWithoutPassword, club: newClub });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/owner/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

        const owner = clubOwners.find(o => o.email === email);
        if (!owner || !await bcrypt.compare(password, owner.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const club = clubs.find(c => c.ownerId === owner.id);
        const token = jwt.sign({ ownerId: owner.id, email: owner.email, clubId: club?.id, isOwner: true }, JWT_SECRET, { expiresIn: '24h' });
        const { password: _, ...ownerWithoutPassword } = owner;
        res.json({ message: 'Owner login successful', token, owner: ownerWithoutPassword, club: club });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Owner dashboard
app.get('/api/owner/dashboard', authenticateOwner, (req, res) => {
    const club = clubs.find(c => c.ownerId === req.owner.ownerId);
    const clubBookings = bookings.filter(b => b.clubId === club?.id);
    const clubEvents = events.filter(e => e.clubId === club?.id);
    const clubAttendance = attendance.filter(a => a.clubId === club?.id);

    res.json({
        club, bookings: clubBookings, events: clubEvents, attendance: clubAttendance,
        stats: { totalBookings: clubBookings.length, totalEvents: clubEvents.length, totalAttendance: clubAttendance.filter(a => a.checkedIn).length }
    });
});

app.put('/api/owner/club', authenticateOwner, (req, res) => {
    const { name, description, genre, maxCapacity, regularFee, hours, address, phone } = req.body;
    const club = clubs.find(c => c.ownerId === req.owner.ownerId);
    if (!club) return res.status(404).json({ error: 'Club not found' });

    Object.assign(club, { name: name || club.name, description: description || club.description, genre: genre || club.genre, regularFee: regularFee || club.regularFee, hours: hours || club.hours });
    res.json({ message: 'Club updated successfully', club });
});

app.post('/api/owner/events', authenticateOwner, (req, res) => {
    const { title, date, time, description, ticketPrice, memberPrice } = req.body;
    const club = clubs.find(c => c.ownerId === req.owner.ownerId);
    if (!club) return res.status(404).json({ error: 'Club not found' });

    const newEvent = { id: events.length + 1, clubId: club.id, ownerId: req.owner.ownerId, title, date, time, venue: club.name, description, ticketPrice, memberPrice, createdAt: new Date().toISOString() };
    events.push(newEvent);
    res.status(201).json({ message: 'Event created successfully', event: newEvent });
});

app.get('/api/owner/events', authenticateOwner, (req, res) => {
    const clubEvents = events.filter(e => e.ownerId === req.owner.ownerId);
    res.json(clubEvents);
});

app.get('/api/owner/attendance', authenticateOwner, (req, res) => {
    const club = clubs.find(c => c.ownerId === req.owner.ownerId);
    const clubBookings = bookings.filter(b => b.clubId === club?.id);

    const attendanceData = clubBookings.map(booking => {
        const attendanceRecord = attendance.find(a => a.bookingId === booking.id);
        const user = users.find(u => u.id === booking.userId);

        return {
            bookingId: booking.id, userId: booking.userId, userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
            userEmail: user?.email, entryType: booking.entryType, firstName: booking.firstName, secondName: booking.secondName,
            bookingDate: booking.bookingDate, bookingTime: booking.bookingTime, checkedIn: attendanceRecord?.checkedIn || false,
            checkInTime: attendanceRecord?.checkInTime, checkedOut: attendanceRecord?.checkedOut || false, checkOutTime: attendanceRecord?.checkOutTime
        };
    });

    res.json(attendanceData);
});

app.post('/api/owner/attendance/checkin', authenticateOwner, (req, res) => {
    const { bookingId } = req.body;
    const club = clubs.find(c => c.ownerId === req.owner.ownerId);
    const booking = bookings.find(b => b.id === parseInt(bookingId) && b.clubId === club?.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    let attendanceRecord = attendance.find(a => a.bookingId === booking.id);
    if (!attendanceRecord) {
        attendanceRecord = { id: attendance.length + 1, bookingId: booking.id, userId: booking.userId, clubId: club.id, checkedIn: false, checkedOut: false };
        attendance.push(attendanceRecord);
    }

    attendanceRecord.checkedIn = true;
    attendanceRecord.checkInTime = new Date().toISOString();
    res.json({ message: 'Check-in successful', attendance: attendanceRecord });
});

app.post('/api/owner/attendance/checkout', authenticateOwner, (req, res) => {
    const { bookingId } = req.body;
    const attendanceRecord = attendance.find(a => a.bookingId === parseInt(bookingId));
    if (!attendanceRecord) return res.status(404).json({ error: 'Attendance record not found' });

    attendanceRecord.checkedOut = true;
    attendanceRecord.checkOutTime = new Date().toISOString();
    res.json({ message: 'Check-out successful', attendance: attendanceRecord });
});

// User routes
app.get('/api/profile', authenticateToken, (req, res) => {
    const user = users.find(u => u.id === req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
});

app.put('/api/profile', authenticateToken, (req, res) => {
    const { firstName, lastName, email, phone, city, state } = req.body;
    const user = users.find(u => u.id === req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    Object.assign(user, { firstName, lastName, email, phone, city, state, updatedAt: new Date().toISOString() });
    const { password: _, ...userWithoutPassword } = user;
    res.json({ message: 'Profile updated successfully', user: userWithoutPassword });
});

app.get('/api/clubs', (req, res) => res.json(clubs));
app.get('/api/events', (req, res) => res.json(events));
app.get('/api/membership/tiers', (req, res) => res.json(membershipTiers));

app.post('/api/bookings', authenticateToken, (req, res) => {
    const { clubId, entryType, firstName, secondName, bookingDate, bookingTime, entryFee, platformFee, totalFee, specialRequests } = req.body;

    if (!clubId || !entryType || !firstName || !bookingDate || !bookingTime) {
        return res.status(400).json({ error: 'Missing required booking information' });
    }

    const club = clubs.find(c => c.id === parseInt(clubId));
    const user = users.find(u => u.id === req.user.userId);
    if (!club || !user) return res.status(404).json({ error: 'Club or user not found' });

    const newBooking = {
        id: bookings.length + 1, userId: user.id, clubId: parseInt(clubId), clubName: club.name,
        entryType, firstName, secondName: secondName || null, bookingDate, bookingTime,
        entryFee: entryFee || 0, platformFee: platformFee || 200, totalFee: totalFee || 200,
        specialRequests: specialRequests || '', status: 'confirmed', createdAt: new Date().toISOString()
    };
    bookings.push(newBooking);

    const pointsEarned = entryType === 'table' ? 100 : entryType === 'couple' ? 75 : 50;
    user.points += pointsEarned;
    user.visitCount += 1;
    user.membershipTier = calculateUserTier(user.points);

    res.status(201).json({ message: 'Booking confirmed', booking: newBooking, pointsEarned });
});

app.get('/api/bookings', authenticateToken, (req, res) => {
    res.json(bookings.filter(b => b.userId === req.user.userId));
});

app.post('/api/users/favorites', authenticateToken, (req, res) => {
    const { clubId } = req.body;
    const user = users.find(u => u.id === req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.favoriteClubs.includes(clubId)) user.favoriteClubs.push(clubId);
    res.json({ message: 'Club added to favorites', favoriteClubs: user.favoriteClubs });
});

app.listen(PORT, () => {
    console.log(`🎉 Club!n Party Vibes System running on http://localhost:${PORT}`);
    console.log(`🎵 User Portal: http://localhost:${PORT} (with party vibes!)`);
    console.log(`🏢 Owner Portal: http://localhost:${PORT}/owner (NOW FULLY WORKING!)`);
    console.log(`📄 Privacy Policy: http://localhost:${PORT}/privacy`);
    console.log(`📋 Terms of Service: http://localhost:${PORT}/terms`);
    console.log('✨ Enhanced with nightclub party aesthetic!');
    console.log('🔧 Owner Portal Fixed - Full Dashboard Available!');
});
