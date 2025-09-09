// scripts/migrate-objectids.mjs
import 'dotenv/config';
import { MongoClient } from 'mongodb';

const uri =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    ''; // bắt buộc có

const dbName =
    process.env.DB_NAME ||
    process.env.MONGO_DB ||
    'RecipeFoodDB';

if (!uri || typeof uri !== 'string') {
    throw new Error(
        'Missing MONGO_URI/MONGODB_URI. Hãy đặt trong .env hoặc truyền biến môi trường.'
    );
}

const client = new MongoClient(uri, {});

async function run() {
    await client.connect();
    const db = client.db(dbName);
    const recipes = db.collection('recipes');

    console.log('Connected. Start migration…');

    // 1) createdBy -> ObjectId
    const r1 = await recipes.updateMany(
        {},
        [
            {
                $set: {
                    createdBy: {
                        $convert: {
                            input: '$createdBy',
                            to: 'objectId',
                            onError: '$createdBy',
                            onNull: '$createdBy',
                        },
                    },
                },
            },
        ],
    );
    console.log('createdBy => ObjectId:', r1.matchedCount, r1.modifiedCount);

    // 2) ratings[*].user -> ObjectId
    const r2 = await recipes.updateMany(
        { ratings: { $type: 'array' } },
        [
            {
                $set: {
                    ratings: {
                        $map: {
                            input: '$ratings',
                            as: 'r',
                            in: {
                                $mergeObjects: [
                                    '$$r',
                                    {
                                        user: {
                                            $cond: [
                                                { $eq: [{ $type: '$$r.user' }, 'objectId'] },
                                                '$$r.user',
                                                {
                                                    $convert: {
                                                        input: '$$r.user',
                                                        to: 'objectId',
                                                        onError: '$$r.user',
                                                        onNull: '$$r.user',
                                                    },
                                                },
                                            ],
                                        },
                                    },
                                ],
                            },
                        },
                    },
                },
            },
        ],
    );
    console.log('ratings.user => ObjectId:', r2.matchedCount, r2.modifiedCount);

    // 3) comments[*].user -> ObjectId
    const r3 = await recipes.updateMany(
        { comments: { $type: 'array' } },
        [
            {
                $set: {
                    comments: {
                        $map: {
                            input: '$comments',
                            as: 'c',
                            in: {
                                $mergeObjects: [
                                    '$$c',
                                    {
                                        user: {
                                            $cond: [
                                                { $eq: [{ $type: '$$c.user' }, 'objectId'] },
                                                '$$c.user',
                                                {
                                                    $convert: {
                                                        input: '$$c.user',
                                                        to: 'objectId',
                                                        onError: '$$c.user',
                                                        onNull: '$$c.user',
                                                    },
                                                },
                                            ],
                                        },
                                    },
                                ],
                            },
                        },
                    },
                },
            },
        ],
    );
    console.log('comments.user => ObjectId:', r3.matchedCount, r3.modifiedCount);

    const sample = await recipes.findOne({}, { projection: { createdBy: 1, ratings: 1, comments: 1 } });
    console.log('Sample after migration:', sample);

    await client.close();
    console.log('Done.');
}

run().catch(async (e) => {
    console.error('[Migration failed]', e?.message || e);
    try { await client.close(); } catch { }
    process.exit(1);
});
