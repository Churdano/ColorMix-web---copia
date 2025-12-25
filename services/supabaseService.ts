
import { supabase } from './supabase';
import { UserProfile, Paint, RecipeHistoryItem, UserSettings } from '../types';

export const supabaseService = {
    // Fetch all users with their inventory and history
    async getUsers(): Promise<UserProfile[]> {
        const { data: usersData, error } = await supabase
            .from('app_users')
            .select(`
        *,
        inventory (*),
        history (*)
      `);

        if (error) {
            console.error('Error fetching users:', error);
            throw error;
        }

        if (!usersData) return [];

        // Transform DB snake_case to app camelCase
        return usersData.map((u: any) => ({
            id: u.id,
            name: u.name,
            avatarColor: u.avatar_color,
            createdAt: parseInt(u.created_at),
            settings: u.settings,
            inventory: (u.inventory || []).map((i: any) => ({
                id: i.id,
                brand: i.brand,
                name: i.name,
                category: i.category,
                hex: i.hex
            })),
            history: (u.history || []).map((h: any) => ({
                id: h.id,
                timestamp: parseInt(h.timestamp),
                recipe: h.recipe
            })).sort((a: any, b: any) => b.timestamp - a.timestamp) // Sort history desc
        }));
    },

    async createUser(user: UserProfile) {
        // 1. Create User
        const { error: userError } = await supabase
            .from('app_users')
            .insert({
                id: user.id,
                name: user.name,
                avatar_color: user.avatarColor,
                created_at: user.createdAt,
                settings: user.settings
            });

        if (userError) throw userError;

        // 2. Create Initial Inventory
        if (user.inventory.length > 0) {
            const inventoryRows = user.inventory.map(p => ({
                user_id: user.id,
                brand: p.brand,
                name: p.name,
                category: p.category,
                hex: p.hex
            }));

            const { error: invError } = await supabase
                .from('inventory')
                .insert(inventoryRows);

            if (invError) throw invError;
        }
    },

    async deleteUser(userId: string) {
        // Cascade delete handles inventory and history
        const { error } = await supabase
            .from('app_users')
            .delete()
            .eq('id', userId);

        if (error) throw error;
    },

    async updateSettings(userId: string, settings: UserSettings) {
        const { error } = await supabase
            .from('app_users')
            .update({ settings })
            .eq('id', userId);

        if (error) throw error;
    },

    async updateInventory(userId: string, inventory: Paint[]) {
        // For simplicity in this sync model, we'll delete all and re-insert
        // Or we can try to be smarter. But since the app passes the whole array,
        // full replace is safest to ensure consistency with local state.
        // HOWEVER, deleting requires IDs.
        // The app generates new IDs or keeps existing?
        // Let's just delete all for this user and re-insert. It's not efficient but reliable for this scale.

        const { error: deleteError } = await supabase
            .from('inventory')
            .delete()
            .eq('user_id', userId);

        if (deleteError) throw deleteError;

        if (inventory.length > 0) {
            const inventoryRows = inventory.map(p => ({
                user_id: userId,
                brand: p.brand,
                name: p.name,
                category: p.category,
                hex: p.hex
            }));

            const { error: insertError } = await supabase
                .from('inventory')
                .insert(inventoryRows);

            if (insertError) throw insertError;
        }
    },

    async addHistoryItem(userId: string, item: RecipeHistoryItem) {
        const { error } = await supabase
            .from('history')
            .insert({
                id: item.id,
                user_id: userId,
                timestamp: item.timestamp,
                recipe: item.recipe
            });

        if (error) throw error;
    },

    async deleteHistoryItem(itemId: string) {
        const { error } = await supabase
            .from('history')
            .delete()
            .eq('id', itemId);

        if (error) throw error;
    }
};
