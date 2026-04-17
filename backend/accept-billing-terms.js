const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function acceptBillingTerms() {
    try {
        const email = 'sarah@gmail.com';
        
        console.log('🔧 Accepting billing terms for:', email);
        
        const user = await prisma.user.update({
            where: { email },
            data: {
                billingTermsAcceptedAt: new Date()
            }
        });
        
        console.log('✅ Billing terms accepted!');
        console.log('   Email:', user.email);
        console.log('   Manager Terms:', user.managerTermsAcceptedAt ? '✅ Accepted' : '❌ Not accepted');
        console.log('   Billing Terms:', user.billingTermsAcceptedAt ? '✅ Accepted' : '❌ Not accepted');
        console.log('   Billing Status:', user.billingStatus);
        
        console.log('\n🎉 You can now create properties!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

acceptBillingTerms();
