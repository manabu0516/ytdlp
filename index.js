const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (_req, res) => {
    res.send('Hello, world!');
});

app.listen(PORT, () => {
    console.log(`API listening on port ${PORT}`);
});