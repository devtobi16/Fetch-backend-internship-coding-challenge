import express from "express";
import Joi from "joi";

const app = express();
app.use(express.json());

// Store transactions in a list (payer, points, timestamp)
const transactions = [];
let balance = {};

// Function to update the balance from transactions
const updateBalance = () => {
  balance = {};
  transactions.forEach(({ payer, points }) => {
    if (!balance[payer]) balance[payer] = 0;
    balance[payer] += points;
  });
};

// Endpoint to add points
app.post("/add", (req, res) => {
  const { payer, points, timestamp } = req.body;

  // Validation
  const { error } = validateTransaction(req.body);
  if (error) {
    return res.status(400).send(error.details[0].message);
  }

  // Add transaction to the list
  transactions.push({ payer, points, timestamp });

  updateBalance();

  res.status(200).send();
});

// Endpoint to spend points
app.post("/spend", (req, res) => {
  const { points: pointsToSpend } = req.body;

  if (typeof pointsToSpend !== "number" || pointsToSpend <= 0) {
    return res.status(400).send("Invalid points value");
  }

  let remainingPoints = pointsToSpend;
  const pointsSpent = [];

  // Sort transactions by timestamp (oldest first)
  transactions.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  for (let transaction of transactions) {
    if (remainingPoints <= 0) break;

    if (transaction.points > 0) {
      const pointsToDeduct = Math.min(transaction.points, remainingPoints);
      transaction.points -= pointsToDeduct;
      remainingPoints -= pointsToDeduct;
      pointsSpent.push({ payer: transaction.payer, points: -pointsToDeduct });
    }
  }

  // If there are still points left to spend, return an error
  if (remainingPoints > 0) {
    return res.status(400).send("Not enough points");
  }
  updateBalance();

  return res.status(200).json(pointsSpent);
});

// Endpoint to get points balance by payer
app.get("/balance", (req, res) => {
  return res.status(200).json(balance);
});

// Validation function for add and spend requests
function validateTransaction(transaction) {
  const schema = Joi.object({
    payer: Joi.string().required(),
    points: Joi.number().integer().required(),
    timestamp: Joi.string().isoDate().required(),
  });
  return schema.validate(transaction);
}

// Start the server on port 8000
const port = 8000;
app.listen(port, () => console.log(`Server running on port ${port}`));
