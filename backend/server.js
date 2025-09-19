const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const app = express();

app.use(express.json());
app.use(express.static('public')); // serve frontend

// --- MongoDB connection (hardcoded URI) ---
mongoose.connect('mongodb://127.0.0.1:27017/githubtracker', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// --- MongoDB Schema ---
const repoSchema = new mongoose.Schema({
    username: String,
    repos: Array
});
const Repo = mongoose.model('Repo', repoSchema);

// --- API to fetch GitHub repos and save ---
app.post('/fetch', async (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).send('Username required');

    try {
        const response = await axios.get(`https://api.github.com/users/${username}/repos`);
        const repos = response.data.map(repo => ({
            name: repo.name,
            stars: repo.stargazers_count,
            forks: repo.forks_count
        }));

        // Save or update in MongoDB
        await Repo.findOneAndUpdate({ username }, { repos }, { upsert: true });

        res.json(repos);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error fetching GitHub data');
    }
});

// --- API to get repo data for chart ---
app.get('/chart/:username', async (req, res) => {
    const { username } = req.params;
    const data = await Repo.findOne({ username });
    if (!data) return res.status(404).send('No data found');
    res.json(data.repos);
});

app.listen(3000, () => console.log('Server running on port 3000'));
