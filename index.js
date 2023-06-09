const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vuuhbip.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});


const verifyJwt = (req, res, next) => {
 try {
   const authorization = req.headers.authorization;
   if (!authorization) {
     return res
       .status(401)
       .send({ error: true, message: "unauthorized access" });
   }
   const token = authorization.split(" ")[1];
   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
     if (error) {
       return res
         .status(401)
         .send({ error: true, message: "unauthorized access" });
     }
     req.decoded = decoded;
     next();
   });
 } catch (error) {
  res.send(error)
 }
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();


    const serviceCollection = client.db('carDoctor').collection('services');
    const bookingsCollection = client.db('carDoctor').collection('bookings');

    // jwt
    app.post('/jwt',(req, res) => {
      try {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: "1h",
        });
        res.send({ token });
      } catch (error) {
        res.send(error)
      }
    })


    // services routes
    app.get('/services', async(req, res) => {
      try {
        const cursor = serviceCollection.find();
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        res.send(error)
      }
    })


    app.get('/services/:id', async(req, res) => {
     try {
       const id = req.params.id;
       const query = { _id: new ObjectId(id) };

       const options = {
         // Include only the `title` and `imdb` fields in the returned document
         projection: { title: 1, price: 1, service_id: 1, img: 1 },
       };

       const result = await serviceCollection.findOne(query, options);
       res.send(result);
     } catch (error) {
      res.send(error)
     }
    })

    // Bookings routes
    // read
    app.get('/bookings', verifyJwt, async (req, res) => {
      try {
        const decoded = req.decoded;
        if (decoded.user !== req.query.email) {
          return res
            .status(403)
            .send({ error: true, message: "forbidden access" });
        }

        let query = {};
        if (req.query?.email) {
          query = { email: req.query.email };
        }

        const result = await bookingsCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        res.send(error)
      }
    })

    // create
    app.post('/bookings', async(req, res) => {
      try {
        const booking = req.body;
        const result = await bookingsCollection.insertOne(booking);
        res.send(result);
      } catch (error) {
        res.send(error)
      }
    })

    // update
    app.patch('/bookings/:id', async(req, res) => {
     try {
       const id = req.params.id;
       const updateBooking = req.body;
       const filter = { _id: new ObjectId(id) };
       const updateInfo = {
         $set: {
           status: updateBooking.status,
         },
       };
       const result = await bookingsCollection.updateOne(filter, updateInfo);
       res.send(result);
     } catch (error) {
      res.send(error)
     }
    })

    // delete
    app.delete('/bookings/:id', async(req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await bookingsCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        res.send(error)
      }
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("car doctors is running!!");
});

app.listen(port, () => {
  console.log(`car doctors running on port: ${port}`);
});
