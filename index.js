const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();

// middlewre 
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bkdzfxe.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJwt(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access');
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    try {
        const usersCollection = client.db('tuitionMela').collection('users');

             // verify student
             const verifyStudent = async (req, res, next) => {
                const decodedEmail = req.decoded.email;
                const query = { email: decodedEmail };
                const user = await usersCollection.findOne(query);
    
                if (user?.role !== 'student') {
                    return res.status(403).send({ message: 'forbidden access' })
                }
                next();
            };
    
            // verifytutor
            const verifyTutor = async (req, res, next) => {
                const decodedEmail = req.decoded.email;
                const query = { email: decodedEmail };
                const user = await usersCollection.findOne(query);
    
                if (user?.role !== 'tutor') {
                    return res.status(403).send({ message: 'forbidden access' })
                }
                next();
            };
    
            // send token 
            app.get('/jwt', async (req, res) => {
                const email = req.query.email;
                const query = {
                    email: email
                }
                const user = await usersCollection.findOne(query);
                if (user) {
                    const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '24h' });
                    return res.send({ accessToken: token });
                }
                res.status(403).send({ accessToken: '' })
            });
    
            // usestudent
            app.get('/users/student/:email', async (req, res) => {
                const email = req.params.email;
                const query = { email }
                const user = await usersCollection.findOne(query);
                res.send({ isStudent: user?.role === 'student' })
            });
    
            // usetutor
            app.get('/users/tutor/:email', async (req, res) => {
                const email = req.params.email;
                const query = { email }
                const user = await usersCollection.findOne(query);
                res.send({ isTutor: user?.role === 'tutor' })
            });
    
            // create usersCollection
            app.post('/users', async (req, res) => {
                const user = req.body;
                const result = await usersCollection.insertOne(user);
                res.send(result);
            });
    
            // get user 
            app.get('/profile/:email', async (req, res) => {
                const email = req.params.email;
                const query = { email };
                const user = await usersCollection.find(query).toArray();
                res.send(user);
            });

            app.post('/users/:email', async (req, res) => {
                const email = req.params.email;
                console.log(req.body);
                const user = req.body;
                const query = { email }
                const updatedDoc = {
                    $set: {
                        name: user.name,
                        email: user.email,
                        location: user.location
                    }
                }
                const result = await usersCollection.updateOne(query, updatedDoc);
                res.send(result);
            })
    }
    finally {

    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Tuition Mela server is Running here');
});

app.listen(port, () => {
    console.log(`Tuition Mela server is running on port ${port}`);
})