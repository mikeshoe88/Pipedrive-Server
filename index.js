// index.js
import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 8080;

const API_TOKEN = 'd92decd10ac756b8d61ef9ee7446cebc365ae059';
const SERVICE_FIELD_KEY = '5b436b45b63857305f9691910b6567351b5517bc';
const VALID_SERVICE_IDS = [27, 28, 29, 37, 38, 39, 40, 41, 42];

app.use(bodyParser.json());

app.post('/webhook', async (req, res) => {
  try {
    const { data, meta } = req.body;
    const dealId = data?.id || meta?.entity_id;

    if (!dealId) {
      console.warn('❌ No deal ID');
      return res.status(400).send('❌ Deal ID missing');
    }

    const serviceTypeId = data?.custom_fields?.[SERVICE_FIELD_KEY]?.id;

    if (!VALID_SERVICE_IDS.includes(serviceTypeId)) {
      console.log(`⚠️ Deal ${dealId} skipped due to invalid service type (${serviceTypeId})`);
      return res.status(200).send('⚠️ Invalid service type');
    }

    const taskPayload = {
      subject: 'Billed/Invoice',
      type: 'task',
      deal_id: parseInt(dealId),
      done: 0
    };

    const response = await fetch(`https://api.pipedrive.com/v1/activities?api_token=${API_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskPayload)
    });

    const result = await response.json();

    if (result.success) {
      console.log(`✅ Task created for deal ${dealId}`);
      res.status(200).send(`✅ Task created for deal ${dealId}`);
    } else {
      console.error('❌ Task creation failed', result);
      res.status(500).send('❌ Failed to create task');
    }

  } catch (error) {
    console.error('❌ Exception caught:', error);
    res.status(500).send('❌ Internal Server Error');
  }
});

app.get('/', (req, res) => {
  res.send('✅ Pipedrive Webhook Server is running');
});

app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
