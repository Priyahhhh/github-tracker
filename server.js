const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const path = require('path');
const app = express();

app.use(express.json());

// Serve index.html directly (frontend)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// MongoDB connection
mongoose.connect('mongodb://127.0.0.1:27017/githubtracker', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Repo schema (include language)
const repoSchema = new mongoose.Schema({
    username: String,
    repos: [
        {
            name: String,
            stars: Number,
            forks: Number,
            language: String
        }
    ]
});
const Repo = mongoose.model('Repo', repoSchema);

// --- POST /fetch : fetch GitHub repos & store in MongoDB ---
app.post('/fetch', async (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).send('Username required');

    try {
        const response = await axios.get(`https://api.github.com/users/${username}/repos`);
        const repos = response.data.map(repo => ({
            name: repo.name,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            language: repo.language
        }));

        await Repo.findOneAndUpdate({ username }, { repos }, { upsert: true });
        res.json({ message: 'Repos saved', count: repos.length });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error fetching GitHub data');
    }
});

// --- GET /chart/:username : return repo data for charts ---
app.get('/chart/:username', async (req, res) => {
    const { username } = req.params;
    const data = await Repo.findOne({ username });
    if (!data) return res.status(404).send('No data found');
    res.json(data.repos);
});

// --- Start server ---
app.listen(3000, () => console.log('Server running on port 3000'));
