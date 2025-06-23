require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb'); // Import MongoDB client

const app = express();
const PORT = 3002; // Updated port



app.use(cors());
app.use(express.json()); // Middleware to parse JSON requests

// Serve static files from the root directory
app.use(express.static(__dirname)); // Serve from the current directory

// MongoDB connection setup
const uri = process.env.MONGODB_URI; // Use environment variable

// Configure connection options
const client = new MongoClient(uri, {
    connectTimeoutMS: 10000,
    serverSelectionTimeoutMS: 10000,
    retryWrites: true,
    retryReads: true,
    tls: true,
    tlsCAFile: process.env.MONGODB_CA_PATH,
    tlsAllowInvalidHostnames: true
});




let db;

// Connect to MongoDB with detailed logging and retry logic
async function connectToMongoDB() {
    console.log('Attempting to connect to MongoDB...');
    try {
        await client.connect();
        db = client.db('attendance_system'); // Access the database
        console.log('Successfully connected to MongoDB database:', db.databaseName);
        
        // Verify collections exist
        const collections = await db.listCollections().toArray();
        console.log('Available collections:', collections.map(c => c.name));
        
        // Verify required collections exist
        const requiredCollections = ['students', 'attendance'];
        const missingCollections = requiredCollections.filter(
            col => !collections.some(c => c.name === col)
        );
        
        if (missingCollections.length > 0) {
            console.warn('Warning: Missing required collections:', missingCollections);
        }
    } catch (err) {
        console.error('Failed to connect to MongoDB. Error details:', {
            message: err.message,
            code: err.code,
            stack: err.stack
        });
        if (err.code === 'MongoServerSelectionError') {
            console.error('SSL/TLS connection error detected. Please verify:');
            console.error('1. MONGODB_URI in .env file');
            console.error('2. MONGODB_CA_PATH if using custom CA');
            console.error('3. Network connectivity to MongoDB server');
        }


        console.log('Retrying connection in 5 seconds...');
        setTimeout(connectToMongoDB, 5000);
        return;
    }
}

// Start the connection
connectToMongoDB();



// Verification endpoint
app.get('/verify/:id', async (req, res) => {
    const studentId = req.params.id;
    try {
        const student = await db.collection('students').findOne({ student_id: studentId });
        if (student) {
            res.json({ message: "Student found", name: student.name }); // Return structured response
        } else {
            res.json({ message: "Student not found." }); // Return structured response
        }
    } catch (error) {
        res.status(500).json({ message: 'Error querying database', error });
    }
});

//fetch attendance endpoint
app.get('/attendance', async (req, res) => {
    const { studentId, startDate, endDate } = req.query;
    let query = {};

    if (studentId) {
        // Use regex to filter student_id starting with the provided letters
        query.student_id = { $regex: `^${studentId}`, $options: 'i' }; // Case-insensitive
    }

    if (startDate && endDate) {
        query.punch_in_time = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    } else if (startDate) {
        query.punch_in_time = { $gte: new Date(startDate) };
    } else if (endDate) {
        query.punch_in_time = { $lte: new Date(endDate) };
    }

    try {
        const records = await db.collection('attendance').aggregate([
            {
                $match: query
            },
            {
                $lookup: {
                    from: "students",
                    localField: "student_id",
                    foreignField: "student_id",
                    as: "student_info"
                }
            },
            {
                $unwind: "$student_info"
            },
            {
                $project: {
                    student_id: 1,
                    punch_in_time: 1,
                    punch_out_time: 1,
                    punched_out: 1,
                    student_name: "$student_info.name"
                }
            }
        ]).toArray();
        res.json(records);

    } catch (error) {
        res.status(500).json({ message: 'Error fetching attendance records', error });
    }
});

// Root route to serve index.html
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Punch-in endpoint
app.post('/punch-in/:studentId', async (req, res) => {
    const studentId = req.params.studentId;
    const istDate = new Date(); 
    console.log('Punch-in timestamp:', istDate);

    try {
        // Check if the student has an active punch-in without a punch-out
        const activeRecord = await db.collection('attendance').findOne({ student_id: studentId, punched_out: false });

        if (activeRecord) {
            return res.status(400).json({ message: 'Already punched in. Please punch out first.' });
        }

        // Insert a new record for this punch-in
        await db.collection('attendance').insertOne({
            student_id: studentId,
            punch_in_time: istDate,
            punched_out: false
        });

        res.json({ message: 'Successfully punched in.', success: true });
    } catch (error) {
        console.error('Error punching in:', error);
        res.status(500).json({ message: 'Error punching in', error });
    }
});

// Punch-out endpoint
app.post('/punch-out/:studentId', async (req, res) => {
    const studentId = req.params.studentId;
    const istDate = new Date(); 
    console.log('Punch-out timestamp:', istDate);

    try {
        // Find the latest active punch-in record
        const activeRecord = await db.collection('attendance').findOne({ student_id: studentId, punched_out: false });

        if (!activeRecord) {
            return res.status(400).json({ message: 'No active punch-in record found. Please punch in first.' });
        }

        // Update the latest active record with punch-out time
        await db.collection('attendance').updateOne(
            { _id: activeRecord._id }, // Update only this specific record
            { $set: { punch_out_time: istDate, punched_out: true } }
        );

        res.json({ message: 'Successfully punched out.', success: true });
    } catch (error) {
        console.error('Error punching out:', error);
        res.status(500).json({ message: 'Error punching out', error });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
