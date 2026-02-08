import "dotenv/config";
import { query } from "./src/lib/db";

async function fixDrivers() {
    try {
        console.log("Checking driver table structure...");
        const columns = await query<any[]>("DESCRIBE `driver`;");
        console.log("Columns:", JSON.stringify(columns, null, 2));

        console.log("Making all drivers online...");
        const result = await query("UPDATE `driver` SET availabilityStatus = 'online';");
        console.log("Update result:", JSON.stringify(result, null, 2));

        const drivers = await query<any[]>("SELECT * FROM `driver`;");
        console.log("Current drivers:", JSON.stringify(drivers, null, 2));

        console.log("Checking orders...");
        const orders = await query<any[]>("SELECT id, status, deliveryFee FROM `order` WHERE status IN ('ready-for-pickup', 'confirmed', 'pending', 'placed');");
        console.log("Relevant orders:", JSON.stringify(orders, null, 2));

        const allCount = await query<any[]>("SELECT COUNT(*) as count FROM `order`;");
        console.log("Total orders in DB:", allCount[0].count);
    } catch (error) {
        console.error("Error fixing drivers:", error);
    }
}

fixDrivers();
