module.exports = {
    apps: [
        {
            name: 'update-backend',
            script: 'app.js',
            env: {
                NODE_ENV: 'production',
            },
        },
    ],
};
