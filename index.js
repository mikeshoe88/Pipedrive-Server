const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const API_TOKEN = 'd92decd10ac756b8d61ef9ee7446cebc365ae059';
const SERVICE_FIELD_KEY = '5b436b45b63857305f9691910b6567351b5517bc';
const VALID_SERVICE_IDS = [27, 28, 29, 37, 38, 39, 40, 41, 42];

app.post('/webhook', async (req, res) => {
  try {
    const body = req.body;
    const dealId = body.data?.id || body.meta?.entity_id;

    if (!dealId) {
      console.log('❌ Deal ID missing');
      return res.status(400).send('❌ Deal ID missing');
    }

    const serviceType = body.data?.custom_fields?.[SERVICE_FIELD_KEY]?.id;
    if (!VALID_SERVICE_IDS.includes(serviceType)) {
      console.log(`⚠️ Skipped: Invalid or missing service type (${serviceType})`);
      return res.status(200).send('⚠️ Skipped — invalid service type');
    }

    const taskBody = {
      subject: 'Billed/Invoice',
      type: 'task',
      deal_id: parseInt(dealId),
      done: 0
    };

    const result = await axios.post(
      `https://api.pipedrive.com/v1/activities?api_token=${API_TOKEN}`,
      taskBody,
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (result.data?.success) {
      console.log(`✅ Task created for deal ${dealId}`);
      return res.status(200).send(`✅ Task created for deal ${dealId}`);
    } else {
      console.log('❌ Task creation failed', result.data);
      return res.status(500).send('❌ Task creation failed');
    }
  } catch (err) {
    console.error('❌ EXCEPTION:', err);
    return res.status(500).send('❌ Internal server error');
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
