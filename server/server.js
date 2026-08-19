import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));

app.get('/api/test', (req, res) => {
  res.json({ success: true });
});

app.listen(5000, () => {
  console.log('Server running on 5000');
});
