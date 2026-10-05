import crypto from 'crypto';
import { CropPlan } from '../../types.js';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient.js';

// Development personas list
const DEV_PERSONAS = ['usr_rahul_customer', 'usr_ramesh_farmer', 'usr_saraswathi_farmer', 'usr_vikram_delivery'];

// Isolated in-memory store for development fixture crop plans
const devCropPlansStore: CropPlan[] = [
  {
    id: 'cp_dev_101',
    farmer_id: 'usr_ramesh_farmer',
    crop_name: 'Vine-Ripened Organic Tomatoes',
    season: 'Kharif / Monsoon',
    planting_date: '2026-06-15',
    expected_harvest_date: '2026-09-30',
    area_acres: 1.5,
    notes: 'Drip-irrigated plot near eastern well. Intercropped with marigold for natural pest control.',
    status: 'GROWING',
    created_at: '2026-06-15T08:00:00.000Z',
    updated_at: '2026-06-15T08:00:00.000Z',
  },
  {
    id: 'cp_dev_102',
    farmer_id: 'usr_saraswathi_farmer',
    crop_name: 'Premium Banganapalli Mangoes',
    season: 'Zaid / Summer',
    planting_date: '2026-01-10',
    expected_harvest_date: '2026-05-20',
    area_acres: 3.0,
    notes: 'Certified organic orchard. Scheduled post-harvest bio-fertilizer application.',
    status: 'HARVESTED',
    created_at: '2026-01-10T09:30:00.000Z',
    updated_at: '2026-05-20T17:00:00.000Z',
  },
];

export const supabaseCropPlansRepo = {
  isAvailable(): boolean {
    return isSupabaseConfigured();
  },

  isDevPersona(userId: string): boolean {
    return DEV_PERSONAS.includes(userId);
  },

  isDevPlan(planId: string): boolean {
    return planId.startsWith('cp_dev_') || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(planId);
  },

  /**
   * Retrieve all crop plans owned by an authenticated farmer
   */
  async getByFarmerId(farmerId: string): Promise<CropPlan[]> {
    if (this.isDevPersona(farmerId)) {
      return devCropPlansStore
        .filter((p) => p.farmer_id === farmerId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return [];
    }

    try {
      const { data: rows, error } = await supabase
        .from('crop_plans')
        .select('*')
        .eq('farmer_id', farmerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[SupabaseCropPlans] Error fetching crop plans:', error.message);
        return [];
      }

      return (rows || []).map((row) => ({
        id: row.crop_plan_id,
        farmer_id: row.farmer_id,
        crop_name: row.crop_name,
        season: row.season || undefined,
        planting_date: row.planting_date || undefined,
        expected_harvest_date: row.expected_harvest_date || undefined,
        area_acres: row.area_acres !== null ? Number(row.area_acres) : undefined,
        notes: row.notes || undefined,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
    } catch (err) {
      console.error('[SupabaseCropPlans] Exception getting crop plans:', err);
      return [];
    }
  },

  /**
   * Retrieve a specific crop plan with strict farmer ownership verification
   */
  async getPlanById(planId: string, farmerId: string): Promise<CropPlan | null> {
    if (this.isDevPlan(planId) || this.isDevPersona(farmerId)) {
      const plan = devCropPlansStore.find((p) => p.id === planId);
      if (!plan) return null;
      if (plan.farmer_id !== farmerId) {
        throw new Error('Forbidden: You do not have permission to view this crop plan');
      }
      return plan;
    }

    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data: row, error } = await supabase
      .from('crop_plans')
      .select('*')
      .eq('crop_plan_id', planId)
      .maybeSingle();

    if (error || !row) return null;

    if (row.farmer_id !== farmerId) {
      throw new Error('Forbidden: You do not have permission to view this crop plan');
    }

    return {
      id: row.crop_plan_id,
      farmer_id: row.farmer_id,
      crop_name: row.crop_name,
      season: row.season || undefined,
      planting_date: row.planting_date || undefined,
      expected_harvest_date: row.expected_harvest_date || undefined,
      area_acres: row.area_acres !== null ? Number(row.area_acres) : undefined,
      notes: row.notes || undefined,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  },

  /**
   * Create a new crop plan for the authenticated farmer
   */
  async create(
    farmerId: string,
    data: {
      cropName: string;
      season?: string;
      plantingDate?: string;
      expectedHarvestDate?: string;
      areaAcres?: number;
      notes?: string;
      status?: string;
    }
  ): Promise<{ success: boolean; plan: CropPlan }> {
    if (!data.cropName || typeof data.cropName !== 'string' || !data.cropName.trim()) {
      throw new Error('Crop name is required');
    }

    let area: number | undefined = undefined;
    if (data.areaAcres !== undefined && data.areaAcres !== null) {
      area = Number(data.areaAcres);
      if (!Number.isFinite(area) || area <= 0) {
        throw new Error('Area in acres must be a positive number');
      }
    }

    if (data.plantingDate && data.expectedHarvestDate) {
      if (new Date(data.expectedHarvestDate).getTime() < new Date(data.plantingDate).getTime()) {
        throw new Error('Expected harvest date cannot be earlier than planting date');
      }
    }

    const validStatuses = ['PLANNED', 'GROWING', 'HARVESTED', 'CANCELLED'];
    let finalStatus = (data.status || 'PLANNED').toUpperCase();
    if (!validStatuses.includes(finalStatus)) {
      finalStatus = 'PLANNED';
    }

    const now = new Date().toISOString();

    // Isolated development store
    if (this.isDevPersona(farmerId)) {
      const planId = `cp_dev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const plan: CropPlan = {
        id: planId,
        farmer_id: farmerId,
        crop_name: data.cropName.trim(),
        season: data.season?.trim() || 'Kharif',
        planting_date: data.plantingDate || now.slice(0, 10),
        expected_harvest_date: data.expectedHarvestDate || undefined,
        area_acres: area,
        notes: data.notes?.trim() || undefined,
        status: finalStatus,
        created_at: now,
        updated_at: now,
      };
      devCropPlansStore.unshift(plan);
      return { success: true, plan };
    }

    // Real farmer -> Supabase crop_plans
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Database client is unavailable');
    }

    const planId = crypto.randomUUID();
    const { error: insErr } = await supabase.from('crop_plans').insert({
      crop_plan_id: planId,
      farmer_id: farmerId,
      crop_name: data.cropName.trim(),
      season: data.season?.trim() || null,
      planting_date: data.plantingDate || null,
      expected_harvest_date: data.expectedHarvestDate || null,
      area_acres: area !== undefined ? area : null,
      notes: data.notes?.trim() || null,
      status: finalStatus,
      created_at: now,
      updated_at: now,
    });

    if (insErr) {
      console.error('[SupabaseCropPlans] Insert error:', insErr.message);
      throw new Error(`Failed to save crop plan in database: ${insErr.message}`);
    }

    const plan: CropPlan = {
      id: planId,
      farmer_id: farmerId,
      crop_name: data.cropName.trim(),
      season: data.season?.trim() || undefined,
      planting_date: data.plantingDate || undefined,
      expected_harvest_date: data.expectedHarvestDate || undefined,
      area_acres: area,
      notes: data.notes?.trim() || undefined,
      status: finalStatus,
      created_at: now,
      updated_at: now,
    };

    return { success: true, plan };
  },

  /**
   * Update an existing crop plan with strict ownership check
   */
  async update(
    planId: string,
    farmerId: string,
    updates: Partial<{
      cropName: string;
      season: string;
      plantingDate: string;
      expectedHarvestDate: string;
      areaAcres: number;
      notes: string;
      status: string;
    }>
  ): Promise<{ success: boolean; plan: CropPlan }> {
    const existing = await this.getPlanById(planId, farmerId);
    if (!existing) {
      throw new Error('Crop plan not found');
    }

    if (existing.farmer_id !== farmerId) {
      throw new Error('Forbidden: You can only modify your own crop plans');
    }

    if (updates.cropName !== undefined && (!updates.cropName || !updates.cropName.trim())) {
      throw new Error('Crop name cannot be empty');
    }

    let area = existing.area_acres;
    if (updates.areaAcres !== undefined && updates.areaAcres !== null) {
      const numArea = Number(updates.areaAcres);
      if (!Number.isFinite(numArea) || numArea <= 0) {
        throw new Error('Area in acres must be a positive number');
      }
      area = numArea;
    }

    const pDate = updates.plantingDate !== undefined ? updates.plantingDate : existing.planting_date;
    const hDate = updates.expectedHarvestDate !== undefined ? updates.expectedHarvestDate : existing.expected_harvest_date;
    if (pDate && hDate && new Date(hDate).getTime() < new Date(pDate).getTime()) {
      throw new Error('Expected harvest date cannot be earlier than planting date');
    }

    const now = new Date().toISOString();
    const finalStatus = updates.status ? updates.status.toUpperCase() : existing.status;

    if (this.isDevPlan(planId) || this.isDevPersona(farmerId)) {
      existing.crop_name = updates.cropName !== undefined ? updates.cropName.trim() : existing.crop_name;
      existing.season = updates.season !== undefined ? updates.season.trim() : existing.season;
      existing.planting_date = pDate;
      existing.expected_harvest_date = hDate;
      existing.area_acres = area;
      existing.notes = updates.notes !== undefined ? updates.notes.trim() : existing.notes;
      existing.status = finalStatus;
      existing.updated_at = now;
      return { success: true, plan: existing };
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Database client unavailable');
    }

    const dbUpdates: any = {
      updated_at: now,
    };
    if (updates.cropName !== undefined) dbUpdates.crop_name = updates.cropName.trim();
    if (updates.season !== undefined) dbUpdates.season = updates.season.trim();
    if (updates.plantingDate !== undefined) dbUpdates.planting_date = updates.plantingDate;
    if (updates.expectedHarvestDate !== undefined) dbUpdates.expected_harvest_date = updates.expectedHarvestDate;
    if (updates.areaAcres !== undefined) dbUpdates.area_acres = area;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes.trim();
    if (updates.status !== undefined) dbUpdates.status = finalStatus;

    const { error: updErr } = await supabase
      .from('crop_plans')
      .update(dbUpdates)
      .eq('crop_plan_id', planId)
      .eq('farmer_id', farmerId);

    if (updErr) {
      throw new Error(`Failed to update crop plan: ${updErr.message}`);
    }

    const updatedPlan: CropPlan = {
      ...existing,
      crop_name: updates.cropName !== undefined ? updates.cropName.trim() : existing.crop_name,
      season: updates.season !== undefined ? updates.season.trim() : existing.season,
      planting_date: pDate,
      expected_harvest_date: hDate,
      area_acres: area,
      notes: updates.notes !== undefined ? updates.notes.trim() : existing.notes,
      status: finalStatus,
      updated_at: now,
    };

    return { success: true, plan: updatedPlan };
  },

  /**
   * Delete a crop plan with strict ownership check
   */
  async delete(planId: string, farmerId: string): Promise<{ success: boolean }> {
    const existing = await this.getPlanById(planId, farmerId);
    if (!existing) {
      throw new Error('Crop plan not found');
    }

    if (existing.farmer_id !== farmerId) {
      throw new Error('Forbidden: You can only delete your own crop plans');
    }

    if (this.isDevPlan(planId) || this.isDevPersona(farmerId)) {
      const idx = devCropPlansStore.findIndex((p) => p.id === planId && p.farmer_id === farmerId);
      if (idx !== -1) {
        devCropPlansStore.splice(idx, 1);
      }
      return { success: true };
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Database client unavailable');
    }

    const { error: delErr } = await supabase
      .from('crop_plans')
      .delete()
      .eq('crop_plan_id', planId)
      .eq('farmer_id', farmerId);

    if (delErr) {
      throw new Error(`Failed to delete crop plan: ${delErr.message}`);
    }

    return { success: true };
  },
};
