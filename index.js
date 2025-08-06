const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 8080;

// Constants (you can later move to Railway env variables)
const API_TOKEN = 'd92decd10ac756b8d61ef9ee7446cebc365ae059';
const SERVICE_FIELD_KEY = '5b436b45b63857305f9691910b6567351b5517bc';
const VALID_SERVICE_IDS = [27, 28, 29, 37, 38, 39, 40, 41, 42];

app.use(bodyParser.json());

// ✅ Webhook endpoint
app.post('/', async (req, res) => {
  const body = req.body;
  const dealId = body.data?.id || body.meta?.entity_id;

  if (!dealId) {
    console.log('❌ No Deal ID in payload');
    return res.status(400).send('No deal ID found');
  }

  const serviceType = body.data?.custom_fields?.[SERVICE_FIELD_KEY]?.id;

  if (!VALID_SERVICE_IDS.includes(serviceType)) {
    console.log(`⚠️ Skipped: Deal ${dealId} has invalid or missing service type (${serviceType})`);
    return res.status(200).send('Skipped: invalid or missing service type');
  }

  // Calculate due date as 5 days from today
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 5);
  const formattedDueDate = dueDate.toISOString().split('T')[0];

  const taskBody = {
    subject: 'Billed/Invoice',
    type: 'task',
    deal_id: parseInt(dealId),
    done: 0,
    due_date: formattedDueDate
  };

  try {
    const response = await axios.post(
      `https://api.pipedrive.com/v1/activities?api_token=${API_TOKEN}`,
      taskBody,
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (response.data.success) {
      console.log(`✅ Task Created for Deal ${dealId}`);
      res.status(200).send(`Task created for deal ${dealId}`);
    } else {
      console.log(`❌ Task creation failed: ${JSON.stringify(response.data)}`);
      res.status(500).send('Task creation failed');
    }
  } catch (err) {
    console.error('❌ Exception:', err.message);
    res.status(500).send('Internal server error');
  }
});

// Health check
app.get('/', (req, res) => {
  res.send('✅ Pipedrive Webhook Server is running');
});

app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
