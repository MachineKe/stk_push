import express from 'express';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import { authToken } from './middlewares/authorization.js';
import router from './routes/lipaNaMpesa.js';
import { initNgrok } from './middlewares/ngrokUrl.js';
import callback from './routes/callback.js';





dotenv.config();
const app = express();
const port = process.env.PORT || 8080;





const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.json());



app.use('/static', express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(initNgrok)
app.use(router)
app.use(callback)

app.get("/", authToken,async(req, res) => {
  console.log(req.domain);
  res.render('payment');
  });


app.get("/success", (req, res) => {
  res.render("success", {
    type: "successful",
    heading: "Transaction Successful"
  });
});

app.get("/failed", (req, res) => {
  res.render("failed", {
    type: "failed",
    heading: "Transaction Failed",
    desc: "Your transaction was not successful."
  });
});

app.get("/dashboard", (req, res) => {
  res.render("dashboard");
});

app.listen(port,  () => {

  console.log(`Server running on port ${port}`);

  });
  
