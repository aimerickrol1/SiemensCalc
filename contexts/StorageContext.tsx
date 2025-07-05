import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Project, Building, FunctionalZone, Shutter, SearchResult } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Interface pour l'historique des calculs rapides
export interface QuickCalcHistoryItem {
  id: string;
  referenceFlow: number;
  measuredFlow: number;
  deviation: number;
  status: 'compliant' | 'acceptable' | 'non-compliant';
  color: string;
  timestamp: Date;
}

interface StorageContextType {
  // État de chargement
  isLoading: boolean;
  isInitialized: boolean;
  
  // Données principales
  projects: Project[];
  favoriteProjects: string[];
  favoriteBuildings: string[];
  favoriteZones: string[];
  favoriteShutters: string[];
  quickCalcHistory: QuickCalcHistoryItem[];
  
  // Actions pour les projets
  createProject: (projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'buildings'>) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<Project | null>;
  deleteProject: (id: string) => Promise<boolean>;
  
  // Actions pour les bâtiments
  createBuilding: (projectId: string, buildingData: Omit<Building, 'id' | 'projectId' | 'createdAt' | 'functionalZones'>) => Promise<Building | null>;
  updateBuilding: (buildingId: string, updates: Partial<Building>) => Promise<Building | null>;
  deleteBuilding: (buildingId: string) => Promise<boolean>;
  
  // Actions pour les zones
  createFunctionalZone: (buildingId: string, zoneData: Omit<FunctionalZone, 'id' | 'buildingId' | 'createdAt' | 'shutters'>) => Promise<FunctionalZone | null>;
  updateFunctionalZone: (zoneId: string, updates: Partial<FunctionalZone>) => Promise<FunctionalZone | null>;
  deleteFunctionalZone: (zoneId: string) => Promise<boolean>;
  
  // Actions pour les volets
  createShutter: (zoneId: string, shutterData: Omit<Shutter, 'id' | 'zoneId' | 'createdAt' | 'updatedAt'>) => Promise<Shutter | null>;
  updateShutter: (shutterId: string, updates: Partial<Shutter>) => Promise<Shutter | null>;
  deleteShutter: (shutterId: string) => Promise<boolean>;
  
  // Actions pour les favoris
  setFavoriteProjects: (favorites: string[]) => Promise<void>;
  setFavoriteBuildings: (favorites: string[]) => Promise<void>;
  setFavoriteZones: (favorites: string[]) => Promise<void>;
  setFavoriteShutters: (favorites: string[]) => Promise<void>;
  
  // Actions pour l'historique
  addQuickCalcHistory: (item: Omit<QuickCalcHistoryItem, 'id' | 'timestamp'>) => Promise<void>;
  clearQuickCalcHistory: () => Promise<void>;
  getQuickCalcHistory: () => Promise<QuickCalcHistoryItem[]>;
  
  // Recherche
  searchShutters: (query: string) => SearchResult[];
  
  // Utilitaires
  clearAllData: () => Promise<void>;
  getStorageInfo: () => { projectsCount: number; totalShutters: number; storageSize: string };
  getProjects: () => Promise<Project[]>;
  getFavoriteBuildings: () => Promise<string[]>;
  getFavoriteZones: () => Promise<string[]>;
  getFavoriteShutters: () => Promise<string[]>;
}

const StorageContext = createContext<StorageContextType | undefined>(undefined);

// Clés de stockage
const STORAGE_KEYS = {
  PROJECTS: 'SIEMENS_PROJECTS_STORAGE',
  FAVORITE_PROJECTS: 'SIEMENS_FAVORITE_PROJECTS',
  FAVORITE_BUILDINGS: 'SIEMENS_FAVORITE_BUILDINGS',
  FAVORITE_ZONES: 'SIEMENS_FAVORITE_ZONES',
  FAVORITE_SHUTTERS: 'SIEMENS_FAVORITE_SHUTTERS',
  QUICK_CALC_HISTORY: 'SIEMENS_QUICK_CALC_HISTORY',
};

// Fonction utilitaire pour générer un ID unique
function generateUniqueId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

interface StorageProviderProps {
  children: ReactNode;
}

export function StorageProvider({ children }: StorageProviderProps) {
  // États React pour toutes les données
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [favoriteProjects, setFavoriteProjectsState] = useState<string[]>([]);
  const [favoriteBuildings, setFavoriteBuildingsState] = useState<string[]>([]);
  const [favoriteZones, setFavoriteZonesState] = useState<string[]>([]);
  const [favoriteShutters, setFavoriteShuttersState] = useState<string[]>([]);
  const [quickCalcHistory, setQuickCalcHistoryState] = useState<QuickCalcHistoryItem[]>([]);

  // CRITIQUE : Ref pour maintenir la version la plus récente des projets
  const projectsRef = useRef<Project[]>([]);

  // Mettre à jour la ref chaque fois que l'état projects change
  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  // Initialisation au montage du provider
  useEffect(() => {
    initializeStorage();
  }, []);

  const initializeStorage = async () => {
    try {
      setIsLoading(true);
      
      // Charger toutes les données en parallèle
      const [
        projectsData,
        favProjectsData,
        favBuildingsData,
        favZonesData,
        favShuttersData,
        historyData
      ] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.PROJECTS),
        AsyncStorage.getItem(STORAGE_KEYS.FAVORITE_PROJECTS),
        AsyncStorage.getItem(STORAGE_KEYS.FAVORITE_BUILDINGS),
        AsyncStorage.getItem(STORAGE_KEYS.FAVORITE_ZONES),
        AsyncStorage.getItem(STORAGE_KEYS.FAVORITE_SHUTTERS),
        AsyncStorage.getItem(STORAGE_KEYS.QUICK_CALC_HISTORY),
      ]);

      // Parser et convertir les projets
      if (projectsData) {
        try {
          const parsedProjects = JSON.parse(projectsData);
          const processedProjects = parsedProjects.map((project: any) => ({
            ...project,
            createdAt: new Date(project.createdAt),
            updatedAt: new Date(project.updatedAt),
            startDate: project.startDate ? new Date(project.startDate) : undefined,
            endDate: project.endDate ? new Date(project.endDate) : undefined,
            buildings: (project.buildings || []).map((building: any) => ({
              ...building,
              createdAt: new Date(building.createdAt),
              functionalZones: (building.functionalZones || []).map((zone: any) => ({
                ...zone,
                createdAt: new Date(zone.createdAt),
                shutters: (zone.shutters || []).map((shutter: any) => ({
                  ...shutter,
                  createdAt: new Date(shutter.createdAt),
                  updatedAt: new Date(shutter.updatedAt)
                }))
              }))
            }))
          }));
          setProjects(processedProjects);
        } catch (error) {
          console.error('Erreur parsing projets:', error);
          setProjects([]);
        }
      }

      // Parser les favoris
      setFavoriteProjectsState(favProjectsData ? JSON.parse(favProjectsData) : []);
      setFavoriteBuildingsState(favBuildingsData ? JSON.parse(favBuildingsData) : []);
      setFavoriteZonesState(favZonesData ? JSON.parse(favZonesData) : []);
      setFavoriteShuttersState(favShuttersData ? JSON.parse(favShuttersData) : []);

      // Parser l'historique
      if (historyData) {
        try {
          const parsedHistory = JSON.parse(historyData);
          const processedHistory = parsedHistory.map((item: any) => ({
            ...item,
            timestamp: new Date(item.timestamp)
          }));
          setQuickCalcHistoryState(processedHistory);
        } catch (error) {
          console.error('Erreur parsing historique:', error);
          setQuickCalcHistoryState([]);
        }
      }

      setIsInitialized(true);
    } catch (error) {
      console.error('Erreur initialisation storage:', error);
      setIsInitialized(true);
    } finally {
      setIsLoading(false);
    }
  };

  // CORRIGÉ : Fonction utilitaire pour sauvegarder les projets ET mettre à jour l'état React
  const saveProjects = async (newProjects: Project[]) => {
    try {
      console.log('💾 Sauvegarde de', newProjects.length, 'projets...');
      await AsyncStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(newProjects));
      console.log('✅ Projets sauvegardés dans AsyncStorage');
      
      // CRITIQUE : Mettre à jour l'état React immédiatement
      setProjects(newProjects);
      console.log('✅ État React mis à jour avec', newProjects.length, 'projets');
    } catch (error) {
      console.error('❌ Erreur sauvegarde projets:', error);
      throw error;
    }
  };

  // Actions pour les projets
  const createProject = async (projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'buildings'>): Promise<Project> => {
    console.log('🚀 StorageContext.createProject appelé avec:', projectData);
    
    const newProject: Project = {
      ...projectData,
      id: generateUniqueId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      buildings: []
    };
    
    console.log('📦 Nouveau projet créé:', newProject);
    
    const newProjects = [...projectsRef.current, newProject];
    await saveProjects(newProjects);
    
    console.log('✅ Projet ajouté à la liste, total:', newProjects.length);
    return newProject;
  };

  const updateProject = async (id: string, updates: Partial<Project>): Promise<Project | null> => {
    console.log('✏️ StorageContext.updateProject appelé pour:', id, 'avec:', updates);
    
    const projectIndex = projectsRef.current.findIndex(p => p.id === id);
    if (projectIndex === -1) {
      console.error('❌ Projet non trouvé:', id);
      return null;
    }
    
    const updatedProject = { ...projectsRef.current[projectIndex], ...updates, updatedAt: new Date() };
    const newProjects = [...projectsRef.current];
    newProjects[projectIndex] = updatedProject;
    
    await saveProjects(newProjects);
    console.log('✅ Projet mis à jour:', updatedProject.id);
    return updatedProject;
  };

  const deleteProject = async (id: string): Promise<boolean> => {
    console.log('🗑️ StorageContext.deleteProject appelé pour:', id);
    
    const projectIndex = projectsRef.current.findIndex(p => p.id === id);
    if (projectIndex === -1) {
      console.error('❌ Projet non trouvé pour suppression:', id);
      return false;
    }
    
    const newProjects = projectsRef.current.filter(p => p.id !== id);
    const newFavoriteProjects = favoriteProjects.filter(fId => fId !== id);
    
    await Promise.all([
      saveProjects(newProjects),
      setFavoriteProjects(newFavoriteProjects)
    ]);
    
    console.log('✅ Projet supprimé:', id);
    return true;
  };

  // Actions pour les bâtiments
  const createBuilding = async (projectId: string, buildingData: Omit<Building, 'id' | 'projectId' | 'createdAt' | 'functionalZones'>): Promise<Building | null> => {
    console.log('🏗️ StorageContext.createBuilding appelé pour projet:', projectId, 'avec:', buildingData);
    
    const projectIndex = projectsRef.current.findIndex(p => p.id === projectId);
    if (projectIndex === -1) {
      console.error('❌ Projet non trouvé pour création bâtiment:', projectId);
      return null;
    }

    const newBuilding: Building = {
      ...buildingData,
      id: generateUniqueId(),
      projectId,
      createdAt: new Date(),
      functionalZones: []
    };

    console.log('🏢 Nouveau bâtiment créé:', newBuilding);

    const newProjects = [...projectsRef.current];
    newProjects[projectIndex] = {
      ...newProjects[projectIndex],
      buildings: [...newProjects[projectIndex].buildings, newBuilding],
      updatedAt: new Date()
    };

    await saveProjects(newProjects);
    console.log('✅ Bâtiment ajouté au projet:', newBuilding.id);
    return newBuilding;
  };

  const updateBuilding = async (buildingId: string, updates: Partial<Building>): Promise<Building | null> => {
    console.log('✏️ StorageContext.updateBuilding appelé pour:', buildingId, 'avec:', updates);
    
    const newProjects = [...projectsRef.current];
    
    for (let i = 0; i < newProjects.length; i++) {
      const buildingIndex = newProjects[i].buildings.findIndex(b => b.id === buildingId);
      if (buildingIndex !== -1) {
        const updatedBuilding = { ...newProjects[i].buildings[buildingIndex], ...updates };
        newProjects[i] = {
          ...newProjects[i],
          buildings: [
            ...newProjects[i].buildings.slice(0, buildingIndex),
            updatedBuilding,
            ...newProjects[i].buildings.slice(buildingIndex + 1)
          ],
          updatedAt: new Date()
        };
        
        await saveProjects(newProjects);
        console.log('✅ Bâtiment mis à jour:', updatedBuilding.id);
        return updatedBuilding;
      }
    }
    
    console.error('❌ Bâtiment non trouvé pour mise à jour:', buildingId);
    return null;
  };

  const deleteBuilding = async (buildingId: string): Promise<boolean> => {
    console.log('🗑️ StorageContext.deleteBuilding appelé pour:', buildingId);
    
    const newProjects = [...projectsRef.current];
    let found = false;
    
    for (let i = 0; i < newProjects.length; i++) {
      const buildingIndex = newProjects[i].buildings.findIndex(b => b.id === buildingId);
      if (buildingIndex !== -1) {
        newProjects[i] = {
          ...newProjects[i],
          buildings: newProjects[i].buildings.filter(b => b.id !== buildingId),
          updatedAt: new Date()
        };
        found = true;
        break;
      }
    }
    
    if (found) {
      const newFavoriteBuildings = favoriteBuildings.filter(fId => fId !== buildingId);
      await Promise.all([
        saveProjects(newProjects),
        setFavoriteBuildings(newFavoriteBuildings)
      ]);
      console.log('✅ Bâtiment supprimé:', buildingId);
    } else {
      console.error('❌ Bâtiment non trouvé pour suppression:', buildingId);
    }
    
    return found;
  };

  // Actions pour les zones
  const createFunctionalZone = async (buildingId: string, zoneData: Omit<FunctionalZone, 'id' | 'buildingId' | 'createdAt' | 'shutters'>): Promise<FunctionalZone | null> => {
    console.log('🏢 StorageContext.createFunctionalZone appelé pour bâtiment:', buildingId, 'avec:', zoneData);
    
    const newProjects = [...projectsRef.current];
    
    for (let i = 0; i < newProjects.length; i++) {
      const buildingIndex = newProjects[i].buildings.findIndex(b => b.id === buildingId);
      if (buildingIndex !== -1) {
        const newZone: FunctionalZone = {
          ...zoneData,
          id: generateUniqueId(),
          buildingId,
          createdAt: new Date(),
          shutters: []
        };
        
        console.log('🏗️ Nouvelle zone créée:', newZone);
        
        newProjects[i] = {
          ...newProjects[i],
          buildings: [
            ...newProjects[i].buildings.slice(0, buildingIndex),
            {
              ...newProjects[i].buildings[buildingIndex],
              functionalZones: [...newProjects[i].buildings[buildingIndex].functionalZones, newZone]
            },
            ...newProjects[i].buildings.slice(buildingIndex + 1)
          ],
          updatedAt: new Date()
        };
        
        await saveProjects(newProjects);
        console.log('✅ Zone ajoutée au bâtiment:', newZone.id);
        return newZone;
      }
    }
    
    console.error('❌ Bâtiment non trouvé pour création zone:', buildingId);
    return null;
  };

  const updateFunctionalZone = async (zoneId: string, updates: Partial<FunctionalZone>): Promise<FunctionalZone | null> => {
    console.log('✏️ StorageContext.updateFunctionalZone appelé pour:', zoneId, 'avec:', updates);
    
    const newProjects = [...projectsRef.current];
    
    for (let i = 0; i < newProjects.length; i++) {
      for (let j = 0; j < newProjects[i].buildings.length; j++) {
        const zoneIndex = newProjects[i].buildings[j].functionalZones.findIndex(z => z.id === zoneId);
        if (zoneIndex !== -1) {
          const updatedZone = { ...newProjects[i].buildings[j].functionalZones[zoneIndex], ...updates };
          
          newProjects[i] = {
            ...newProjects[i],
            buildings: [
              ...newProjects[i].buildings.slice(0, j),
              {
                ...newProjects[i].buildings[j],
                functionalZones: [
                  ...newProjects[i].buildings[j].functionalZones.slice(0, zoneIndex),
                  updatedZone,
                  ...newProjects[i].buildings[j].functionalZones.slice(zoneIndex + 1)
                ]
              },
              ...newProjects[i].buildings.slice(j + 1)
            ],
            updatedAt: new Date()
          };
          
          await saveProjects(newProjects);
          console.log('✅ Zone mise à jour:', updatedZone.id);
          return updatedZone;
        }
      }
    }
    
    console.error('❌ Zone non trouvée pour mise à jour:', zoneId);
    return null;
  };

  const deleteFunctionalZone = async (zoneId: string): Promise<boolean> => {
    console.log('🗑️ StorageContext.deleteFunctionalZone appelé pour:', zoneId);
    
    const newProjects = [...projectsRef.current];
    let found = false;
    
    for (let i = 0; i < newProjects.length; i++) {
      for (let j = 0; j < newProjects[i].buildings.length; j++) {
        const zoneIndex = newProjects[i].buildings[j].functionalZones.findIndex(z => z.id === zoneId);
        if (zoneIndex !== -1) {
          newProjects[i] = {
            ...newProjects[i],
            buildings: [
              ...newProjects[i].buildings.slice(0, j),
              {
                ...newProjects[i].buildings[j],
                functionalZones: newProjects[i].buildings[j].functionalZones.filter(z => z.id !== zoneId)
              },
              ...newProjects[i].buildings.slice(j + 1)
            ],
            updatedAt: new Date()
          };
          found = true;
          break;
        }
      }
      if (found) break;
    }
    
    if (found) {
      const newFavoriteZones = favoriteZones.filter(fId => fId !== zoneId);
      await Promise.all([
        saveProjects(newProjects),
        setFavoriteZones(newFavoriteZones)
      ]);
      console.log('✅ Zone supprimée:', zoneId);
    } else {
      console.error('❌ Zone non trouvée pour suppression:', zoneId);
    }
    
    return found;
  };

  // Actions pour les volets
  const createShutter = async (zoneId: string, shutterData: Omit<Shutter, 'id' | 'zoneId' | 'createdAt' | 'updatedAt'>): Promise<Shutter | null> => {
    console.log('🔲 StorageContext.createShutter appelé pour zone:', zoneId, 'avec:', shutterData);
    
    const newProjects = [...projectsRef.current];
    
    for (let i = 0; i < newProjects.length; i++) {
      for (let j = 0; j < newProjects[i].buildings.length; j++) {
        const zoneIndex = newProjects[i].buildings[j].functionalZones.findIndex(z => z.id === zoneId);
        if (zoneIndex !== -1) {
          const newShutter: Shutter = {
            ...shutterData,
            id: generateUniqueId(),
            zoneId,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          console.log('🎯 Nouveau volet créé:', newShutter);
          
          newProjects[i] = {
            ...newProjects[i],
            buildings: [
              ...newProjects[i].buildings.slice(0, j),
              {
                ...newProjects[i].buildings[j],
                functionalZones: [
                  ...newProjects[i].buildings[j].functionalZones.slice(0, zoneIndex),
                  {
                    ...newProjects[i].buildings[j].functionalZones[zoneIndex],
                    shutters: [...newProjects[i].buildings[j].functionalZones[zoneIndex].shutters, newShutter]
                  },
                  ...newProjects[i].buildings[j].functionalZones.slice(zoneIndex + 1)
                ]
              },
              ...newProjects[i].buildings.slice(j + 1)
            ],
            updatedAt: new Date()
          };
          
          await saveProjects(newProjects);
          console.log('✅ Volet ajouté à la zone:', newShutter.id);
          return newShutter;
        }
      }
    }
    
    console.error('❌ Zone non trouvée pour création volet:', zoneId);
    return null;
  };

  const updateShutter = async (shutterId: string, updates: Partial<Shutter>): Promise<Shutter | null> => {
    console.log('✏️ StorageContext.updateShutter appelé pour:', shutterId, 'avec:', updates);
    
    const newProjects = [...projectsRef.current];
    
    for (let i = 0; i < newProjects.length; i++) {
      for (let j = 0; j < newProjects[i].buildings.length; j++) {
        for (let k = 0; k < newProjects[i].buildings[j].functionalZones.length; k++) {
          const shutterIndex = newProjects[i].buildings[j].functionalZones[k].shutters.findIndex(s => s.id === shutterId);
          if (shutterIndex !== -1) {
            const updatedShutter = { 
              ...newProjects[i].buildings[j].functionalZones[k].shutters[shutterIndex], 
              ...updates, 
              updatedAt: new Date() 
            };
            
            newProjects[i] = {
              ...newProjects[i],
              buildings: [
                ...newProjects[i].buildings.slice(0, j),
                {
                  ...newProjects[i].buildings[j],
                  functionalZones: [
                    ...newProjects[i].buildings[j].functionalZones.slice(0, k),
                    {
                      ...newProjects[i].buildings[j].functionalZones[k],
                      shutters: [
                        ...newProjects[i].buildings[j].functionalZones[k].shutters.slice(0, shutterIndex),
                        updatedShutter,
                        ...newProjects[i].buildings[j].functionalZones[k].shutters.slice(shutterIndex + 1)
                      ]
                    },
                    ...newProjects[i].buildings[j].functionalZones.slice(k + 1)
                  ]
                },
                ...newProjects[i].buildings.slice(j + 1)
              ],
              updatedAt: new Date()
            };
            
            await saveProjects(newProjects);
            console.log('✅ Volet mis à jour:', updatedShutter.id);
            return updatedShutter;
          }
        }
      }
    }
    
    console.error('❌ Volet non trouvé pour mise à jour:', shutterId);
    return null;
  };

  const deleteShutter = async (shutterId: string): Promise<boolean> => {
    console.log('🗑️ StorageContext.deleteShutter appelé pour:', shutterId);
    
    const newProjects = [...projectsRef.current];
    let found = false;
    
    for (let i = 0; i < newProjects.length; i++) {
      for (let j = 0; j < newProjects[i].buildings.length; j++) {
        for (let k = 0; k < newProjects[i].buildings[j].functionalZones.length; k++) {
          const shutterIndex = newProjects[i].buildings[j].functionalZones[k].shutters.findIndex(s => s.id === shutterId);
          if (shutterIndex !== -1) {
            newProjects[i] = {
              ...newProjects[i],
              buildings: [
                ...newProjects[i].buildings.slice(0, j),
                {
                  ...newProjects[i].buildings[j],
                  functionalZones: [
                    ...newProjects[i].buildings[j].functionalZones.slice(0, k),
                    {
                      ...newProjects[i].buildings[j].functionalZones[k],
                      shutters: newProjects[i].buildings[j].functionalZones[k].shutters.filter(s => s.id !== shutterId)
                    },
                    ...newProjects[i].buildings[j].functionalZones.slice(k + 1)
                  ]
                },
                ...newProjects[i].buildings.slice(j + 1)
              ],
              updatedAt: new Date()
            };
            found = true;
            break;
          }
        }
        if (found) break;
      }
      if (found) break;
    }
    
    if (found) {
      const newFavoriteShutters = favoriteShutters.filter(fId => fId !== shutterId);
      await Promise.all([
        saveProjects(newProjects),
        setFavoriteShutters(newFavoriteShutters)
      ]);
      console.log('✅ Volet supprimé:', shutterId);
    } else {
      console.error('❌ Volet non trouvé pour suppression:', shutterId);
    }
    
    return found;
  };

  // Actions pour les favoris
  const setFavoriteProjects = async (favorites: string[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FAVORITE_PROJECTS, JSON.stringify(favorites));
      setFavoriteProjectsState(favorites);
    } catch (error) {
      console.error('Erreur sauvegarde favoris projets:', error);
    }
  };

  const setFavoriteBuildings = async (favorites: string[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FAVORITE_BUILDINGS, JSON.stringify(favorites));
      setFavoriteBuildingsState(favorites);
    } catch (error) {
      console.error('Erreur sauvegarde favoris bâtiments:', error);
    }
  };

  const setFavoriteZones = async (favorites: string[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FAVORITE_ZONES, JSON.stringify(favorites));
      setFavoriteZonesState(favorites);
    } catch (error) {
      console.error('Erreur sauvegarde favoris zones:', error);
    }
  };

  const setFavoriteShutters = async (favorites: string[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FAVORITE_SHUTTERS, JSON.stringify(favorites));
      setFavoriteShuttersState(favorites);
    } catch (error) {
      console.error('Erreur sauvegarde favoris volets:', error);
    }
  };

  // Actions pour l'historique
  const addQuickCalcHistory = async (item: Omit<QuickCalcHistoryItem, 'id' | 'timestamp'>) => {
    try {
      const newItem: QuickCalcHistoryItem = {
        ...item,
        id: generateUniqueId(),
        timestamp: new Date()
      };
      
      const newHistory = [newItem, ...quickCalcHistory].slice(0, 5);
      
      await AsyncStorage.setItem(STORAGE_KEYS.QUICK_CALC_HISTORY, JSON.stringify(newHistory));
      setQuickCalcHistoryState(newHistory);
    } catch (error) {
      console.error('Erreur ajout historique:', error);
    }
  };

  const clearQuickCalcHistory = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.QUICK_CALC_HISTORY, JSON.stringify([]));
      setQuickCalcHistoryState([]);
    } catch (error) {
      console.error('Erreur effacement historique:', error);
    }
  };

  const getQuickCalcHistory = async (): Promise<QuickCalcHistoryItem[]> => {
    return quickCalcHistory;
  };

  // Recherche
  const searchShutters = (query: string): SearchResult[] => {
    const results: SearchResult[] = [];
    const queryWords = query.toLowerCase().trim().split(/\s+/).filter(word => word.length > 0);

    for (const project of projectsRef.current) {
      for (const building of project.buildings) {
        for (const zone of building.functionalZones) {
          for (const shutter of zone.shutters) {
            const searchableText = [
              shutter.name,
              zone.name,
              building.name,
              project.name,
              project.city || '',
              shutter.remarks || ''
            ].join(' ').toLowerCase();
            
            const matchesAllWords = queryWords.every(word => searchableText.includes(word));
            
            if (matchesAllWords) {
              results.push({ shutter, zone, building, project });
            }
          }
        }
      }
    }

    return results;
  };

  // Utilitaires
  const clearAllData = async () => {
    try {
      await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
      
      setProjects([]);
      setFavoriteProjectsState([]);
      setFavoriteBuildingsState([]);
      setFavoriteZonesState([]);
      setFavoriteShuttersState([]);
      setQuickCalcHistoryState([]);
    } catch (error) {
      console.error('Erreur suppression données:', error);
      throw error;
    }
  };

  const getStorageInfo = () => {
    const totalShutters = projectsRef.current.reduce((total, project) => 
      total + project.buildings.reduce((buildingTotal, building) => 
        buildingTotal + building.functionalZones.reduce((zoneTotal, zone) => 
          zoneTotal + zone.shutters.length, 0), 0), 0);

    const dataString = JSON.stringify(projectsRef.current);
    const storageSize = `${(dataString.length / 1024).toFixed(2)} KB`;

    return {
      projectsCount: projectsRef.current.length,
      totalShutters,
      storageSize
    };
  };

  // Fonctions de compatibilité pour l'ancienne interface
  const getProjects = async (): Promise<Project[]> => {
    return projectsRef.current;
  };

  const getFavoriteBuildings = async (): Promise<string[]> => {
    return favoriteBuildings;
  };

  const getFavoriteZones = async (): Promise<string[]> => {
    return favoriteZones;
  };

  const getFavoriteShutters = async (): Promise<string[]> => {
    return favoriteShutters;
  };

  const value: StorageContextType = {
    isLoading,
    isInitialized,
    projects,
    favoriteProjects,
    favoriteBuildings,
    favoriteZones,
    favoriteShutters,
    quickCalcHistory,
    createProject,
    updateProject,
    deleteProject,
    createBuilding,
    updateBuilding,
    deleteBuilding,
    createFunctionalZone,
    updateFunctionalZone,
    deleteFunctionalZone,
    createShutter,
    updateShutter,
    deleteShutter,
    setFavoriteProjects,
    setFavoriteBuildings,
    setFavoriteZones,
    setFavoriteShutters,
    addQuickCalcHistory,
    clearQuickCalcHistory,
    getQuickCalcHistory,
    searchShutters,
    clearAllData,
    getStorageInfo,
    getProjects,
    getFavoriteBuildings,
    getFavoriteZones,
    getFavoriteShutters,
  };

  return (
    <StorageContext.Provider value={value}>
      {children}
    </StorageContext.Provider>
  );
}

export function useStorage(): StorageContextType {
  const context = useContext(StorageContext);
  if (context === undefined) {
    throw new Error('useStorage must be used within a StorageProvider');
  }
  return context;
}