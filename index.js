const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 5000;
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();

// middlewre
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bkdzfxe.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJwt(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("unauthorized access");
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    const usersCollection = client.db("tuitionMela").collection("users");
    const tuitionsCollection = client.db("tuitionMela").collection("tuitions");
    const applicationsCollection = client
      .db("tuitionMela")
      .collection("applications");

    // verify student
    const verifyStudent = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);

      if (user?.role !== "student") {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // verifytutor
    const verifyTutor = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);

      if (user?.role !== "tutor") {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // send token
    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = {
        email: email,
      };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "24h",
        });
        return res.send({ accessToken: token });
      }
      res.status(403).send({ accessToken: "" });
    });

    // usestudent
    app.get("/users/student/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isStudent: user?.role === "student" });
    });

    // usetutor
    app.get("/users/tutor/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isTutor: user?.role === "tutor" });
    });

    // create usersCollection
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // get user
    app.get("/profile/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.find(query).toArray();
      res.send(user);
    });

    // update profile
    app.post("/users/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const query = { email };
      const updatedDoc = {
        $set: {
          name: user.name,
          email: user.email,
          location: user.location,
          phone: user.phone
        },
      };
      const result = await usersCollection.updateOne(query, updatedDoc);
      res.send(result);
    });

    // get tuitions
    // app.get("/tuitions", async (req, res) => {
    //   const query = {};
    //   const tuitions = await tuitionsCollection.find(query).sort({ $natural: -1 }).toArray();
    //   res.send(tuitions);
    // });

    app.get('/tuitions', async(req, res) =>{
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const query = {}
      const cursor = tuitionsCollection.find(query);
      const tuitions = await cursor.sort({ $natural: -1 }).skip(page*size).limit(size).toArray();
      const count = await tuitionsCollection.estimatedDocumentCount();
      res.send({count, tuitions});
  });

    // add tuition to the collection
    app.post("/tuitions", verifyJwt, verifyStudent, async (req, res) => {
      const tuition = req.body;
      const result = await tuitionsCollection.insertOne(tuition);
      res.send(result);
    });

    // apply
    app.post("/applications", verifyJwt, verifyTutor, async (req, res) => {
      const application = req.body;
      const query = {
        tutorEmail: application.tutorEmail,
        tuitionId: application.tuitionId
    }

    const alreadyApplied = await applicationsCollection.find(query).toArray();
    if (alreadyApplied.length) {
        const message = `You have already applied`
        return res.send({ acknowledged: false, message })
    }
      const result = await applicationsCollection.insertOne(application);
      res.send(result);
    });

    // get all applications 
    app.get("/allApplications", async (req, res) => {
      const query = {};
      const applications = await applicationsCollection.find(query).toArray();
      res.send(applications);
    });

    // get individual post applications 
    app.get("/allApplications/:id", async (req, res) => {
      const id = req.params.id;
      const query = { tuitionId : id };
      const applications = await applicationsCollection.find(query).toArray();
      res.send(applications);
    });

    // get individual applicants applications 
    app.get("/myApplications", async (req, res) => {
      const email = req.query.email;
      const query = { tutorEmail : email };
      const applications = await applicationsCollection.find(query).toArray();
      res.send(applications);
    });

  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Tuition Mela server is Running here");
});

app.listen(port, () => {
  console.log(`Tuition Mela server is running on port ${port}`);
});
