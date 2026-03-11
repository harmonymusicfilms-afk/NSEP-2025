// Script to fix the schema cache issue for class_level column
// This needs to be run against your InsForge database

import { createClient } from '@insforge/sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const backendUrl = process.env.VITE_BACKEND_URL || 'https://z7m852zi.us-east.insforge.app';
const backendKey = process.env.VITE_BACKEND_KEY || '';

// Note: For raw SQL execution on InsForge, you need to use the database.query method
// or execute this SQL through the InsForge dashboard SQL editor

async function fixSchemaCache() {
  try {
    console.log('🔧 Attempting to fix schema cache for class_level column...\n');

    const client = createClient({
      baseUrl: backendUrl,
      anonKey: backendKey,
    });

    // Check if the column exists
    console.log('Checking if class_level column exists in students table...');
    
    // Try a simple query to verify the column
    const { data, error } = await client.database
      .from('students')
      .select('class_level')
      .limit(1);

    if (error) {
      console.error('❌ Error querying class_level column:');
      console.error(error);
      console.log('\n⚠️ This error indicates the schema cache is stale.');
      console.log('\n✅ SOLUTION: You need to execute the following SQL directly in InsForge dashboard:');
      console.log(`
      -- Run this in InsForge SQL Editor
      ALTER TABLE IF EXISTS public.students 
      ADD COLUMN IF NOT EXISTS class_level integer DEFAULT 8;
      
      UPDATE public.students SET class_level = 8 WHERE class_level IS NULL;
      
      ALTER TABLE public.students
      ALTER COLUMN class_level SET NOT NULL;
      
      NOTIFY pgrst, 'reload schema';
      `);
      process.exit(1);
    }

    // If we get here, the column exists and is accessible
    console.log('✅ Schema cache is already updated! The class_level column is accessible.');
    console.log('\nYou can now use student records with class_level data.');

  } catch (err) {
    console.error('❌ Error:', err);
    console.log('\n💡 To manually fix this:');
    console.log('1. Go to your InsForge dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and run the SQL from fix_schema_cache.sql');
    process.exit(1);
  }
}

fixSchemaCache();
