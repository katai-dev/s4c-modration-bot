const MessageCommand = require('../../../structures/MessageCommand');

module.exports = new MessageCommand({
    name: 'reload',
    description: 'إعادة تحميل ورفع أوامر البوت والتحديثات',
    aliases: ['redeploy', 'refreshcmds'],
    deleteCommand: true,
    ownerOnly: true, // Only bot developers/owners should run this on the base handler
});

module.exports.run = async (client, message, args) => {
    const msg = await message.reply('🔄 جاري إعادة تحميل الأوامر وتحديثها في الديسكورد...');

    try {
        // تفريغ الكاش القديم
        client.commands.prefix.clear();
        client.commands.slash.clear();
        client.commands.context.clear();
        client.commands.aliases.clear();

        client.restCommandsBody = [];

        // إعادة تحميل الملفات
        client._commandHandler.load();

        // رفع الأوامر لواجهة برمجة الديسكورد (Discord API)
        await client._commandHandler.register({ enabled: false });

        await msg.edit('✅ **تمت العملية بنجاح!**\nتم إعادة تحميل الأوامر وتحديثها في نظام الديسكورد.');
    } catch (error) {
        console.error('❌ Error during redeploy:', error);
        await msg.edit(`⚠️ حدث خطأ أثناء التحديث:\n\`\`\`js\n${error.message}\n\`\`\``);
    }
};
