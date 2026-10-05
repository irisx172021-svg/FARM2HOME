import { getDatabase, closeDatabase } from './connection.js';
import { initSchema } from './schema.js';
import { seedDatabase } from './seed.js';

import { usersRepo } from './repositories/usersRepo.js';
import { authIdentitiesRepo } from './repositories/authIdentitiesRepo.js';
import { sessionsRepo } from './repositories/sessionsRepo.js';
import { profilesRepo } from './repositories/profilesRepo.js';
import { productsRepo } from './repositories/productsRepo.js';
import { ordersRepo } from './repositories/ordersRepo.js';
import { cartsRepo } from './repositories/cartsRepo.js';
import { wishlistsRepo } from './repositories/wishlistsRepo.js';
import { browseHistoryRepo } from './repositories/browseHistoryRepo.js';
import { reviewsRepo } from './repositories/reviewsRepo.js';
import { cropPlansRepo } from './repositories/cropPlansRepo.js';
import { aiMemoryRepo } from './repositories/aiMemoryRepo.js';

let initialized = false;

export function initDatabase(): void {
  if (initialized) return;
  getDatabase();
  initSchema();
  seedDatabase();
  initialized = true;
}

export {
  getDatabase,
  closeDatabase,
  usersRepo,
  authIdentitiesRepo,
  sessionsRepo,
  profilesRepo,
  productsRepo,
  ordersRepo,
  cartsRepo,
  wishlistsRepo,
  browseHistoryRepo,
  reviewsRepo,
  cropPlansRepo,
  aiMemoryRepo,
};
