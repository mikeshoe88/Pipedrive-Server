const express = require('express');
const fetch = require('node-fetch');
const app = express();

app.use(express.json());

const API_TOKEN = 'd92decd10ac756b8d61ef9ee7446cebc365ae059';
const PRODUCTION_TEAM_FIELD_KEY = '8bbab3c120ade3217b8738f001033064e803cdef';
const SERVICE_FIELD_KEY = '5b436b45b63857305f9691910b6567351b5517bc';
const VALID_SERVICE_IDS = [27, 28, 29, 37, 38, 39, 40, 41, 42];

const PRODUCTION_TEAM_MAP = {
  47: 'Kings',
  48: 'Johnathan',
  49: 'Pena',
  50: 'Hector',
  51: 'Sebastian',
  52: 'Anastacio',
  53: 'Mike',
  54: 'Gary'
};

const ICONS = {
  'Call': '📞',
  'Task': '📌',
  'Deadline': '⏳',
  'Packing/Moving': '📦',
  'Water Damage/Demo': '💧',
  'Moisture Check/Pickup': '🚚',
  'Estimate': '📝'
};

const EXCLUDED_TYPES = ['Meeting', 'Email', 'Lunch'];

app.post('/update-tasks', async (req, res) => {
  try {
    const taskRes = await fetch(`https://api.pipedrive.com/v1/activities?limit=500&api_token=${API_TOKEN}`);
    const taskData = await taskRes.json();

    if (!taskData.success || !taskData.data) {
      return res.status(500).send('Failed to fetch tasks');
    }

    const tasks = taskData.data;
    let updated = 0;

    for (const task of tasks) {
      if (task.done === 1 || EXCLUDED_TYPES.includes(task.type)) continue;

      const dealId = task.deal_id;
      if (!dealId) continue;

      const dealRes = await fetch(`https://api.pipedrive.com/v1/deals/${dealId}?api_token=${API_TOKEN}`);
      const dealData = await dealRes.json();

      if (!dealData.success || !dealData.data) continue;

      const dealTitle = dealData.data.title;
      const teamId = dealData.data[PRODUCTION_TEAM_FIELD_KEY];
      const productionTeam = PRODUCTION_TEAM_MAP[teamId];
      if (!productionTeam) continue;

      const icon = ICONS[task.type] || '📌';
      const newSubject = `${icon} ${task.type} - ${dealTitle} - ${productionTeam}`;

      const updateOptions = {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: newSubject })
      };

      const updateRes = await fetch(`https://api.pipedrive.com/v1/activities/${task.id}?api_token=${API_TOKEN}`, updateOptions);
      const updateResult = await updateRes.json();

      if (updateResult.success) updated++;
    }

    res.send(`✅ Updated ${updated} tasks.`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.post('/deal-created-task', async (req, res) => {
  try {
    const body = req.body;
    const dealId = body?.data?.id || body?.meta?.entity_id;
    const serviceTypeId = body?.data?.custom_fields?.[SERVICE_FIELD_KEY]?.id;
    const addTime = body?.current?.add_time;

    if (!dealId || !VALID_SERVICE_IDS.includes(serviceTypeId)) {
      return res.status(400).send('❌ Invalid or missing service type');
    }

    // Set due date to 5 days after job creation
    const dueDate = new Date(addTime);
    dueDate.setDate(dueDate.getDate() + 5);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    const taskBody = {
      subject: 'Billed/Invoice',
      type: 'task',
      deal_id: parseInt(dealId),
      done: 0,
      due_date: dueDateStr
    };

    const taskRes = await fetch(`https://api.pipedrive.com/v1/activities?api_token=${API_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskBody)
    });

    const taskResult = await taskRes.json();

    if (taskResult.success) {
      res.send(`✅ Billed/Invoice task created for deal ${dealId}`);
    } else {
      res.status(500).send('❌ Task creation failed');
    }
  } catch (err) {
    console.error('🔥 /deal-created-task error:', err);
    res.status(500).send('❌ Server error');
  }
});

app.get('/', (_, res) => res.send('🟢 Server running'));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));
