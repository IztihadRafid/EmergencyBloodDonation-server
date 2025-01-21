const express = require('express')
const cors = require('cors');
const app = express();
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.1rbhjut.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    //Database creation
    const userCollection = client.db('emergencyBloodDonationDB').collection('user'); //normal user when signUp
    const donorCollection = client.db('emergencyBloodDonationDB').collection('donor');//coming from donation form
    const patientBloodRequestCollection = client.db('emergencyBloodDonationDB').collection('request_blood');// coming from request form
    const donationCollection = client.db('emergencyBloodDonationDB').collection('blood_donations'); // Changed collection name

    //-=================================
    //USER related APIS
    //-=================================
    app.post('/user', async (req, res) => {
      const user = req.body;

      //insert email if doesnt exists
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query)

      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }

      const result = await userCollection.insertOne(user);
      res.send(result)
    })

    //===================================================
    //Getting All users from Db
    //===================================================
    app.get('/user', async (req, res) => {
      const email = req.query.email;
      const query = { email: email }
      // console.log(query);
      const result = await userCollection.find(query).toArray();
      res.send(result)
    })

    // Add this with your other user-related APIs
    // app.get('/user', async (req, res) => {
    //   try {
    //     const cursor = userCollection.find();
    //     const users = await cursor.toArray();
    //     res.send(users);
    //   } 
    //   catch (error) {
    //     console.error('Error fetching users:', error);
    //     res.status(500).send({ error: 'Failed to fetch users' });
    //   }
    // });

    //=============================================================
    //    DELETE NORMAL USER BY ADMIN FROM CLIENT (ALL USERs)
    //=============================================================
    app.delete('/user/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await userCollection.deleteOne(query);
      res.send(result)
    })

    //=============================================================
    //    DELETE Requests  BY ADMIN FROM CLIENT (ALL requests)
    //=============================================================
    app.delete('/requestblood/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await patientBloodRequestCollection .deleteOne(query);
      res.send(result)
    })

    //===========================================================
    //  Donor Getting from DB and showing in Client
    //===========================================================  
    app.get('/donor', async (req, res) => {
      const cursor = donorCollection.find();
      const result = await cursor.toArray();
      res.send(result)
    })

    //===========================================================
    // Sending Single Donor Detail infromation to another Route
    //===========================================================
    app.get('/donor/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await donorCollection.findOne(query);
      res.send(result)
    })



    //===========================================================
    //  Donor Form submitting from client and storing in DB
    //===========================================================
    app.post('/donor', async (req, res) => {
      const donor = req.body;
      const result = await donorCollection.insertOne(donor);
      res.send(result);
    })

    //============================================================
    // DELETE DONORS BY ADMIN from Client side and delete from DB
    //============================================================
    app.delete('/donor/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await donorCollection.deleteOne(query);
      res.send(result)
    })


    //===========================================================
    // Request Blood Getting from DB and showing in Client side UI
    //===========================================================  
    app.get('/requestblood', async (req, res) => {
      const cursor = patientBloodRequestCollection.find();
      const result = await cursor.toArray();
      res.send(result)

    })




    //===========================================================
    //Requesting Blood Form submitting from client and storing in DB
    //===========================================================
    app.post('/requestblood', async (req, res) => {
      const requestblood = req.body;
      const result = await patientBloodRequestCollection.insertOne(requestblood);
      res.send(result)
    })


    // Create/Update user endpoint (combined)
    app.put('/user/:email', async (req, res) => {
      try {
        const email = req.params.email;
        const userData = req.body;

        console.log('Attempting to update/create user:', { email, userData });

        // Using upsert to create if doesn't exist or update if exists
        const result = await userCollection.findOneAndUpdate(
          { email: email },
          { $set: userData },
          {
            upsert: true,
            returnDocument: 'after'
          }
        );

        console.log('User update/create result:', result);
        res.json({ success: true, user: result.value });

      } catch (error) {
        console.error('Server error handling user:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to handle user data',
          error: error.message
        });
      }
    });



    // Get user endpoint
    app.get('/user/:email', async (req, res) => {
      try {
        const email = req.params.email;
        console.log('Fetching user with email:', email);

        const user = await userCollection.findOne({ email: email });

        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }

        res.json({
          success: true,
          user: user
        });

      } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to fetch user',
          error: error.message
        });
      }
    });



    // Blood Donation endpoint
    app.post('/blood-donation', async (req, res) => {
      try {
        const donation = req.body;
        console.log('Received donation:', donation);
        const result = await donationCollection.insertOne(donation);
        res.send(result);
      } catch (error) {
        console.error('Error saving donation:', error);
        res.status(500).send({ error: 'Failed to save donation' });
      }
    });




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Emergency Blood server runing')
})

app.listen(port, () => {
  console.log(`Blood Donation project running on port ${port}`)
})