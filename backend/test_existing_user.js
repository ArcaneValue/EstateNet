const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

async function testExistingUser() {
    const prisma = new PrismaClient();

    try {
        // Get the most recent e2e manager
        const user = await prisma.user.findFirst({
            where: {
                email: {
                    contains: 'manager-e2e-'
                },
                role: 'MANAGER'
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        if (user) {
            console.log(`Testing with existing user:`);
            console.log(`- Email: ${user.email}`);
            console.log(`- ID: ${user.id}`);
            console.log(`- Created: ${user.createdAt}`);

            // Create temp JSON file for curl
            const loginData = {
                email: user.email,
                password: "TestPassword123!"
            };

            fs.writeFileSync('temp_login.json', JSON.stringify(loginData));

            // Test login with this user via curl
            const { exec } = require('child_process');
            const cmd = `curl.exe -X POST -H "Content-Type: application/json" --data-binary "@temp_login.json" "http://localhost:3001/api/auth/login"`;

            exec(cmd, (error, stdout, stderr) => {
                console.log(`Login test result:`);
                console.log(`Response: ${stdout}`);
                if (error) console.log(`Error: ${error}`);

                // Cleanup
                fs.unlinkSync('temp_login.json');
            });
        } else {
            console.log('No e2e manager users found');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testExistingUser();
