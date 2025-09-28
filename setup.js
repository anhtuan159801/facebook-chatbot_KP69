#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// ==== SETUP SYSTEM ====
class SystemSetup {
    constructor() {
        this.requiredFiles = [
            'load_balancer.js',
            'gemini.js',
            'router_hug.js',
            'start_system.js',
            'ecosystem.config.js'
        ];
        
        this.requiredDirs = [
            'logs'
        ];
        
        this.envTemplate = {
            // Database
            'DB_HOST': 'your_db_host',
            'DB_PORT': '5432',
            'DB_USER': 'your_db_user',
            'DB_PASSWORD': 'your_db_password',
            'DB_NAME': 'your_db_name',
            
            // Facebook
            'VERIFY_TOKEN': 'your_verify_token',
            'PAGE_ACCESS_TOKEN': 'your_page_access_token',
            
            // APIs
            'GEMINI_API_KEY': 'your_gemini_api_key',
            'OPENROUTER_API_KEY': 'your_openrouter_api_key',
            'HUGGINGFACE_API_KEY': 'your_huggingface_api_key',
            
            // Admin
            'ADMIN_KEY': 'your_admin_key',
            
            // Site Info
            'YOUR_SITE_URL': 'https://your-site.com',
            'YOUR_SITE_NAME': 'YourBotName'
        };
    }

    async run() {
        console.log('🚀 Setting up Chatbot Load Balancer System...\n');
        
        try {
            // Kiểm tra files
            this.checkRequiredFiles();
            
            // Tạo thư mục
            this.createDirectories();
            
            // Kiểm tra .env
            this.checkEnvironmentFile();
            
            // Kiểm tra dependencies
            this.checkDependencies();
            
            console.log('\n✅ Setup completed successfully!');
            console.log('\n📋 Next steps:');
            console.log('1. Update your .env file with correct values');
            console.log('2. Run: npm run start:all');
            console.log('3. Or use PM2: npm run pm2:start');
            console.log('\n📖 For more info, see README_LOAD_BALANCER.md');
            
        } catch (error) {
            console.error('\n❌ Setup failed:', error.message);
            process.exit(1);
        }
    }

    checkRequiredFiles() {
        console.log('🔍 Checking required files...');
        
        const missingFiles = [];
        
        for (const file of this.requiredFiles) {
            if (!fs.existsSync(file)) {
                missingFiles.push(file);
            }
        }
        
        if (missingFiles.length > 0) {
            throw new Error(`Missing required files: ${missingFiles.join(', ')}`);
        }
        
        console.log('✅ All required files found');
    }

    createDirectories() {
        console.log('📁 Creating directories...');
        
        for (const dir of this.requiredDirs) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`✅ Created directory: ${dir}`);
            } else {
                console.log(`✅ Directory exists: ${dir}`);
            }
        }
    }

    checkEnvironmentFile() {
        console.log('🔧 Checking environment configuration...');
        
        if (!fs.existsSync('.env')) {
            console.log('⚠️  .env file not found, creating template...');
            this.createEnvTemplate();
        } else {
            console.log('✅ .env file found');
            this.validateEnvFile();
        }
    }

    createEnvTemplate() {
        let envContent = '# Chatbot Load Balancer Environment Configuration\n';
        envContent += '# Copy this file and update with your actual values\n\n';
        
        envContent += '# Database Configuration\n';
        envContent += 'DB_HOST=your_db_host\n';
        envContent += 'DB_PORT=5432\n';
        envContent += 'DB_USER=your_db_user\n';
        envContent += 'DB_PASSWORD=your_db_password\n';
        envContent += 'DB_NAME=your_db_name\n\n';
        
        envContent += '# Facebook Configuration\n';
        envContent += 'VERIFY_TOKEN=your_verify_token\n';
        envContent += 'PAGE_ACCESS_TOKEN=your_page_access_token\n\n';
        
        envContent += '# API Keys\n';
        envContent += 'GEMINI_API_KEY=your_gemini_api_key\n';
        envContent += 'OPENROUTER_API_KEY=your_openrouter_api_key\n';
        envContent += 'HUGGINGFACE_API_KEY=your_huggingface_api_key\n\n';
        
        envContent += '# Admin Configuration\n';
        envContent += 'ADMIN_KEY=your_admin_key\n\n';
        
        envContent += '# Site Information\n';
        envContent += 'YOUR_SITE_URL=https://your-site.com\n';
        envContent += 'YOUR_SITE_NAME=YourBotName\n';
        
        fs.writeFileSync('.env.template', envContent);
        console.log('✅ Created .env.template file');
        console.log('📝 Please copy .env.template to .env and update with your values');
    }

    validateEnvFile() {
        const envContent = fs.readFileSync('.env', 'utf8');
        const missingVars = [];
        
        for (const [key, defaultValue] of Object.entries(this.envTemplate)) {
            if (!envContent.includes(`${key}=`) || envContent.includes(`${key}=${defaultValue}`)) {
                missingVars.push(key);
            }
        }
        
        if (missingVars.length > 0) {
            console.log('⚠️  Please update these environment variables:');
            missingVars.forEach(varName => {
                console.log(`   - ${varName}`);
            });
        } else {
            console.log('✅ Environment variables look good');
        }
    }

    checkDependencies() {
        console.log('📦 Checking dependencies...');
        
        try {
            const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
            
            const requiredDeps = [
                '@google/generative-ai',
                'dotenv',
                'express',
                'node-fetch',
                'pg',
                'pm2'
            ];
            
            const missingDeps = requiredDeps.filter(dep => !dependencies[dep]);
            
            if (missingDeps.length > 0) {
                console.log('⚠️  Missing dependencies:');
                missingDeps.forEach(dep => {
                    console.log(`   - ${dep}`);
                });
                console.log('📝 Run: npm install');
            } else {
                console.log('✅ All dependencies are installed');
            }
            
        } catch (error) {
            console.log('⚠️  Could not check dependencies:', error.message);
        }
    }
}

// ==== MAIN ====
async function main() {
    const setup = new SystemSetup();
    await setup.run();
}

// Chạy setup
main().catch(error => {
    console.error('❌ Setup Error:', error);
    process.exit(1);
});
