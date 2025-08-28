import { MongoClient } from 'mongodb';
import 'dotenv/config';

(async () => {
    const client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    const db = client.db(process.env.DB_NAME);

    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ username: 1 }, { unique: true });

    await db.collection('recipes').createIndex({ createdAt: -1 });
    await db.collection('recipes').createIndex({ tags: 1 });
    await db.collection('recipes').createIndex({ "time.total": 1 });
    await db.collection('recipes').createIndex({ createdBy: 1 });
    await db.collection('recipes').createIndex({ title: "text", summary: "text", "ingredients.name": "text" });

    await db.collection('blogs').createIndex({ createdAt: -1 });
    await db.collection('blogs').createIndex({ author: 1 });

    console.log('Index created');
    await client.close();
})();
