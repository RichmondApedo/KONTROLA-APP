import { differenceInDays } from 'date-fns';
import type { Expense } from './types';

export interface FuelStats {
    avgEfficiency: number;
    avgCostPerKm: number;
    totalDistance: number;
    totalLiters: number;
    totalSpend: number;
    estDaysUntilRefuel: number | null;
    efficiencyTrend: 'improving' | 'degrading' | 'stable';
    bestValuePrice: number | null;
    maintenanceDistanceLeft: number | null;
    maintenanceStatus: 'good' | 'warning' | 'critical' | 'unknown';
}

export interface ProcessedFuelExpense extends Expense {
    efficiency: number | null;
    distance: number | null;
    costPerKm: number | null;
}

/**
 * Professional Telematics Logic for Fuel Tracking.
 * Handles Multi-vehicle and Partial fill scenarios.
 */
export function processFuelData(expenses: Expense[], vehicleName?: string): { 
    processed: ProcessedFuelExpense[], 
    stats: FuelStats 
} {
    // 1. Filter and sort by date
    let fuel = expenses
        .filter(e => {
            const cat = e.category?.toLowerCase();
            const isFuel = cat === 'fuel';
            const isTransportWithFuelData = cat === 'transport' && (e.fuelLiters || e.odometer);
            return isFuel || isTransportWithFuelData;
        })
        .filter(e => !vehicleName || e.fuelVehicleName === vehicleName || (vehicleName === 'Default' && !e.fuelVehicleName))
        .sort((a, b) => {
            const dateA = new Date((a.date as any).toDate ? (a.date as any).toDate() : a.date).getTime();
            const dateB = new Date((b.date as any).toDate ? (b.date as any).toDate() : b.date).getTime();
            return dateA - dateB;
        });

    let totalDistance = 0;
    let totalLitersForEfficiency = 0;
    let totalSpend = 0;
    let totalLiters = 0;
    
    // For Partial Fill Logic
    let partialLitersAccumulator = 0;
    let lastFullTankOdometer: number | null = null;

    const processed = fuel.map((expense, index) => {
        let efficiency: number | null = null;
        let distance: number | null = null;
        let costPerKm: number | null = null;

        totalSpend += expense.amount;
        totalLiters += expense.fuelLiters || 0;

        // Calculate distance since last entry (for stats)
        if (index > 0) {
            const prev = fuel[index - 1];
            if (expense.odometer && prev.odometer) {
                const stepDistance = expense.odometer - prev.odometer;
                if (stepDistance > 0) {
                    totalDistance += stepDistance;
                    costPerKm = expense.amount / stepDistance;
                }
            }
        }

        // --- Partial vs Full Tank Efficiency Logic ---
        const isFull = expense.fuelIsFullTank !== false; // Default to true if missing

        if (isFull) {
            if (lastFullTankOdometer !== null && expense.odometer && (expense.fuelLiters || partialLitersAccumulator)) {
                const distSinceFull = expense.odometer - lastFullTankOdometer;
                const totalLitersInCycle = (expense.fuelLiters || 0) + partialLitersAccumulator;
                
                if (distSinceFull > 0 && totalLitersInCycle > 0) {
                    efficiency = distSinceFull / totalLitersInCycle;
                    totalLitersForEfficiency += totalLitersInCycle;
                }
            }
            // Reset accumulator and update last full tank
            partialLitersAccumulator = 0;
            if (expense.odometer) lastFullTankOdometer = expense.odometer;
        } else {
            // It's a partial fill, add to accumulator
            partialLitersAccumulator += expense.fuelLiters || 0;
            // Note: efficiency remains null for partial fills
        }

        const prevExpense = index > 0 ? fuel[index - 1] : null;
        const currentOdo = expense.odometer;
        const prevOdo = prevExpense?.odometer;

        return {
            ...expense,
            efficiency,
            distance: (currentOdo && prevOdo) ? currentOdo - prevOdo : null,
            costPerKm
        };
    });

    // --- Statistics ---
    const avgEfficiency = totalLitersForEfficiency > 0 ? totalDistance / totalLitersForEfficiency : 0;
    const avgCostPerKm = totalDistance > 0 ? totalSpend / totalDistance : 0;

    // --- Refuel Predictor (Estimated Days Remaining) ---
    let estDaysUntilRefuel = null;
    if (fuel.length >= 2) {
        const firstDate = new Date((fuel[0].date as any).toDate ? (fuel[0].date as any).toDate() : fuel[0].date);
        const lastDate = new Date((fuel[fuel.length - 1].date as any).toDate ? (fuel[fuel.length - 1].date as any).toDate() : fuel[fuel.length - 1].date);
        const daysDiff = Math.max(1, differenceInDays(lastDate, firstDate));
        
        const avgDailyDistance = totalDistance / daysDiff;
        
        // Calculate average distance between full-tank refuels
        const fullTankIntervals = fuel.filter(f => f.fuelIsFullTank !== false && f.odometer);
        if (fullTankIntervals.length >= 2 && avgDailyDistance > 0) {
            const totalRefuelDistance = fullTankIntervals[fullTankIntervals.length - 1].odometer! - fullTankIntervals[0].odometer!;
            const avgRefuelRange = totalRefuelDistance / (fullTankIntervals.length - 1);
            
            const lastOdo = fuel[fuel.length - 1].odometer || 0;
            const distSinceLastRefuel = lastOdo - (fullTankIntervals[fullTankIntervals.length - 1].odometer || lastOdo);
            
            const remainingRange = Math.max(0, avgRefuelRange - distSinceLastRefuel);
            estDaysUntilRefuel = Math.round(remainingRange / avgDailyDistance);
        }
    }

    // --- Efficiency Trend ---
    let efficiencyTrend: FuelStats['efficiencyTrend'] = 'stable';
    const recentEfficiencies = processed.filter(p => p.efficiency).slice(-3);
    if (recentEfficiencies.length >= 2) {
        const last = recentEfficiencies[recentEfficiencies.length - 1].efficiency!;
        const prev = recentEfficiencies[recentEfficiencies.length - 2].efficiency!;
        const diff = (last - prev) / prev;
        if (diff > 0.05) efficiencyTrend = 'improving';
        else if (diff < -0.05) efficiencyTrend = 'degrading';
    }

    // --- Best Value Station ---
    let bestValueStation = null;
    let bestValuePrice = null;

    const stationPrices: Record<string, { total: number, count: number }> = {};
    fuel.forEach(f => {
        if (f.station && f.fuelPricePerUnit) {
            if (!stationPrices[f.station]) stationPrices[f.station] = { total: 0, count: 0 };
            stationPrices[f.station].total += f.fuelPricePerUnit;
            stationPrices[f.station].count += 1;
        }
    });

    const stations = Object.keys(stationPrices);
    if (stations.length > 0) {
        const sortedStations = stations
            .map(name => ({
                name,
                avg: stationPrices[name].total / stationPrices[name].count
            }))
            .sort((a, b) => a.avg - b.avg);
        
        bestValueStation = sortedStations[0].name;
        bestValuePrice = sortedStations[0].avg;
    }

    // --- Maintenance Predictor ---
    let maintenanceDistanceLeft: number | null = null;
    let maintenanceStatus: FuelStats['maintenanceStatus'] = 'unknown';

    const maintenanceMarks = fuel.filter(f => f.maintenanceOdometerMark).map(f => f.maintenanceOdometerMark!);
    const lastMaintenanceOdo = maintenanceMarks.length > 0 ? Math.max(...maintenanceMarks) : null;
    const latestOdoObj = fuel.slice().reverse().find(f => f.odometer);
    const latestOdo = latestOdoObj ? latestOdoObj.odometer! : 0;

    const SERVICE_INTERVAL = 5000;

    if (latestOdo > 0) {
        let distSinceService = 0;
        if (lastMaintenanceOdo !== null && latestOdo >= lastMaintenanceOdo) {
            distSinceService = latestOdo - lastMaintenanceOdo;
        } else {
            distSinceService = latestOdo % SERVICE_INTERVAL;
        }

        maintenanceDistanceLeft = Math.max(0, SERVICE_INTERVAL - distSinceService);

        if (maintenanceDistanceLeft > 1000) {
            maintenanceStatus = 'good';
        } else if (maintenanceDistanceLeft > 0) {
            maintenanceStatus = 'warning';
        } else {
            maintenanceStatus = 'critical';
        }
    }

    return {
        processed,
        stats: {
            avgEfficiency,
            avgCostPerKm,
            totalDistance,
            totalLiters,
            totalSpend,
            estDaysUntilRefuel,
            efficiencyTrend,
            bestValueStation,
            bestValuePrice,
            maintenanceDistanceLeft,
            maintenanceStatus
        }
    };
}
