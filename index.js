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
    const userCollection = client.db('emergencyBloodDonationDB').collection('user');
    const donorCollection = client.db('emergencyBloodDonationDB').collection('donor');
    const patientBloodRequestCollection = client.db('emergencyBloodDonationDB').collection('request_blood');
    const donationCollection = client.db('emergencyBloodDonationDB').collection('blood_donations'); // Changed collection name

    //-=================================
    //USER related APIS
    //-=================================
    app.post('/user', async (req, res) => {
      const user = req.body;
      console.log(user);
      const result = await userCollection.insertOne(user);
      res.send(result)
    })



    // Add this with your other user-related APIs
    app.get('/user', async (req, res) => {
      try {
        const cursor = userCollection.find();
        const users = await cursor.toArray();
        res.send(users);
      } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send({ error: 'Failed to fetch users' });
      }
    });




    //===========================================================
    //  Donor Getting from DB and shwoing in Client
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



    // app.get('/userprofile/:id',async(req,res)=>{
    //   const id = req.params.id;
    //   const query = {_id: new ObjectId(id)}
    //   const options={
    //     projection: {email:1,name:1,phone:1},
    //   };
    //   const result = await userCollection.findOne(query,options)
    //   res.send(result)
    // })


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