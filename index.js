const express = require('express')
const cors = require('cors');
const app = express();
const jwt = require('jsonwebtoken')
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;
const nodemailer = require("nodemailer");
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
    const messageCollection = client.db('emergencyBloodDonationDB').collection('allmessage');

    //=============================================================
    // JWT REALTED API
    //=============================================================
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '2h' });
      res.send({ token })
    })


    //middlewares
    const verifyToken = (req, res, next) => {
      // console.log('inside verify token: ', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1]  //spliting token from bearer
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => { //verifying token
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next()
      })

    }


    //=============================================================
    //                VERIFY ADMIN
    //=============================================================
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query)
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      next()
    }




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
    app.get('/user', verifyToken, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result)
    })

    app.get('/user/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin'
      }
      res.send({ admin })
    })

    //=====================================================
    //      MAKING ADMIN  
    //=====================================================
    app.patch('/user/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter, updateDoc);
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
    app.delete('/user/:id', verifyToken, verifyAdmin, async (req, res) => {
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
      const result = await patientBloodRequestCollection.deleteOne(query);
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
    // Sending Single patient Detail infromation to another Route
    //===========================================================
    app.get('/requestDetails/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await patientBloodRequestCollection.findOne(query);

      res.send(result)
    })






    //===================================================================
    //Getting matched district and bloodGroup request for mailing donor
    //===================================================================
    //===================================================================
    //Getting matched district and bloodGroup request for mailing donor
    //===================================================================
    app.post('/match-donors', async (req, res) => {
      const { bloodGroup, district, name, contactNumber, formattedDate, presentAddress, email } = req.body; // From request blood form

      try {
        // Fetch the requested blood details (if needed)
        const requestInfo = await patientBloodRequestCollection.findOne({ bloodGroup, district });

        // Find matching donors based on bloodGroup and district
        const matchingDonors = await donorCollection.find({
          bloodGroup: bloodGroup,
          district: district
        }).toArray();

        console.log("Matching Donors:", matchingDonors);

        if (matchingDonors.length > 0) {

          // Extracting emails from matched donors
          const donorEmails = matchingDonors.map(donor => donor.email);

          // Setting up Nodemailer Transporter
          const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
              user: process.env.EMAIL_USER,   // Your Gmail email
              pass: process.env.EMAIL_PASS    // Your Gmail password or App Password
            }
          });

          // Email Options (Dynamic)
          const mailOptions = {
            from: email, // 👈 Making the requester's email as the sender
            to: donorEmails.join(','), // Sending to all matched donors
            subject: "Blood Donation Request",
            text: `
        Dear Donor,
        We have an Emergency blood request for Blood Group: ${bloodGroup} in ${district}.
        Message from requester: Name:    ${name} 
                                contact: ${contactNumber}
                                Email:   ${email}

      Please contact us if you are available to donate.
      Thank you for your kindness and support!

      Sincerely, Emergency Blood Donation Team 
      Our website: emergencyblooddonation-d3909.firebaseapp.com`

          };

          // Send Email to All Matching Donors
          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              console.error('Error sending email:', error);
              return res.status(500).json({ error: 'Error sending emails to donors.' });
            }

            res.status(200).json({
              message: 'Emails sent successfully to matching donors.',
              requestInfo,
              donors: matchingDonors
            });
          });
        } else {
          return res.status(200).json({
            message: "No matching donors found.",
            requestInfo
          });
        }
      } catch (error) {
        console.error("Error finding donors:", error);
        return res.status(500).json({ error: "Error finding donors" });
      }
    });



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


    //===========================================================
    //  messsage sent from client
    //===========================================================
    app.post('/allmessage', async (req, res) => {
      const message = req.body;
      const result = await messageCollection.insertOne(message);
      res.send(result);
    })
   //===========================================================
    // GET ALL MESSAGE
    //===========================================================  
    app.get('/allmessage', async (req, res) => {
      const cursor = messageCollection.find();
      const result = await cursor.toArray();
      res.send(result)

    })

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