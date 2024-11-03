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


    //-=================================
    //USER related APIS
    //-=================================
    app.post('/user',async(req,res)=>{
        const user =req.body;
        console.log(user);
        const result = await userCollection.insertOne(user);
        res.send(result)
    })

    //===========================================================
    //  Donor Getting from DB and shwoing in Client
    //===========================================================  
    app.get('/donor',async(req,res)=>{
      const cursor = donorCollection.find();
      const result = await cursor.toArray();
      res.send(result)
    })



    
    //===========================================================
    //  Donor Form submitting from client and storing in DB
    //===========================================================
    app.post('/donor',async(req,res)=>{
      const donor = req.body;
      const result = await donorCollection.insertOne(donor);
      res.send(result);
    })




    //===========================================================
    // Request Blood Getting from DB and showing in Client side UI
    //===========================================================  
    app.get('/requestblood',async(req,res)=>{
      const cursor = patientBloodRequestCollection.find();
      const result = await cursor.toArray();
      res.send(result)

    })




    //===========================================================
    //Requesting Blood Form submitting from client and storing in DB
    //===========================================================
    app.post('/requestblood',async(req,res)=>{
      const requestblood = req.body;
      const result= await patientBloodRequestCollection.insertOne(requestblood);
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