import { updateChlorineData, updatePressureData } from './storage';

async function testUpdates() {
    console.log("Testing updates...");

    // Test the chlorine single update feature 
    // This will error if the backend throws an exception
    await updateChlorineData('MJP123', 'TestVillage', 'TestESR', {
        chlorine_value_7: null
    });

}

testUpdates();
