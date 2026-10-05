import { getDatabase } from '../connection.js';

export interface CropPlanRecord {
  id: string;
  farmer_id: string;
  plan_name: string;
  crop_name: string;
  acreage: number;
  target_yield: number | null;
  season: string;
  start_date: string | null;
  status: string;
  created_at: string;
}

export const cropPlansRepo = {
  getByFarmerId(farmerId: string): CropPlanRecord[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM crop_plans WHERE farmer_id = ? ORDER BY created_at DESC').all(farmerId) as any[];
    return rows;
  },

  create(data: {
    farmerId: string;
    planName: string;
    cropName: string;
    acreage: number;
    targetYield?: number;
    season: string;
    startDate?: string;
  }): CropPlanRecord {
    const db = getDatabase();
    const id = `cp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO crop_plans (id, farmer_id, plan_name, crop_name, acreage, target_yield, season, start_date, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.farmerId,
      data.planName,
      data.cropName,
      data.acreage,
      data.targetYield || null,
      data.season,
      data.startDate || now,
      'active',
      now
    );

    return db.prepare('SELECT * FROM crop_plans WHERE id = ?').get(id) as any;
  },

  updateStatus(id: string, farmerId: string, status: string): boolean {
    const db = getDatabase();
    const res = db.prepare('UPDATE crop_plans SET status = ? WHERE id = ? AND farmer_id = ?').run(status, id, farmerId);
    return res.changes > 0;
  },
};
