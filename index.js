// index.js
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const PIPEDRIVE_API_TOKEN = process.env.PIPEDRIVE_API_TOKEN;

app.post('/webhook/deal-created', async (req, res) => {
  try {
    const body = req.body;
    const dealId = body.meta?.id || body.current?.id;

    if (!dealId) {
      return res.status(400).send('Missing deal ID');
    }

    const dealRes = await axios.get(`https://api.pipedrive.com/v1/deals/${dealId}?api_token=${PIPEDRIVE_API_TOKEN}`);
    const deal = dealRes.data?.data;

    const serviceType = deal?.['5b436b45b63857305f9691910b6567351b5517bc'];
    const validServiceIds = [27, 28, 29, 30, 31, 32];

    if (!validServiceIds.includes(parseInt(serviceType))) {
      return res.status(200).send('Service type not valid');
    }

    await axios.post(`https://api.pipedrive.com/v1/activities?api_token=${PIPEDRIVE_API_TOKEN}`, {
      subject: 'Billed/Invoice',
      type: 'task',
      deal_id: dealId,
      done: 0
    });

    return res.status(200).send('✅ Task created');
  } catch (err) {
    console.error(err);
    return res.status(500).send('Server error');
  }
});

app.get('/', (req, res) => {
  res.send('Pipedrive Webhook Server is running');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));
