/**
 * Medication Database Service Module
 * @file /js/data/medication-database.js
 * @description Provides a structured and queryable database of common anti-lipid,
 * anti-hypertensive, and anti-diabetic medications, including expanded inhibitor lists.
 * @version 1.2.0
 * @exports MedicationDatabaseService
 * @warning This data is for informational purposes only. NOT a substitute for professional
 * medical advice or prescribing. Dosages/availability may vary.
 */

'use strict';

// --- Core Medication Data ---
const MEDICATION_DATA = Object.freeze([
    // --- Anti-Lipid Medications ---
    { name: 'Rosuvastatin', brandNames: ['Crestor'], type: 'lipid', class: 'Statin', strength: 'High', dosages: ['5mg', '10mg', '20mg', '40mg'], notes: 'High-intensity statin.' },
    { name: 'Atorvastatin', brandNames: ['Lipitor'], type: 'lipid', class: 'Statin', strength: 'High', dosages: ['10mg', '20mg', '40mg', '80mg'], notes: 'High-intensity statin.' },
    { name: 'Simvastatin', brandNames: ['Zocor'], type: 'lipid', class: 'Statin', strength: 'Moderate', dosages: ['5mg', '10mg', '20mg', '40mg', '80mg'], notes: '80mg dose has increased myopathy risk. Moderate-intensity.' },
    { name: 'Pravastatin', brandNames: ['Pravachol'], type: 'lipid', class: 'Statin', strength: 'Low/Moderate', dosages: ['10mg', '20mg', '40mg', '80mg'], notes: 'Lower-intensity statin.' },
    { name: 'Lovastatin', brandNames: ['Mevacor'], type: 'lipid', class: 'Statin', strength: 'Low/Moderate', dosages: ['10mg', '20mg', '40mg'], notes: 'Lower-intensity statin.' },
    { name: 'Ezetimibe', brandNames: ['Ezetrol'], type: 'lipid', class: 'Cholesterol Absorption Inhibitor', dosages: ['10mg'], notes: 'Often used in combination with statins.' },
    { name: 'Alirocumab', brandNames: ['Praluent'], type: 'lipid', class: 'PCSK9 Inhibitor', dosages: ['75mg/mL', '150mg/mL'], notes: 'Injectable mAb, typically q2-4 weeks.' },
    { name: 'Evolocumab', brandNames: ['Repatha'], type: 'lipid', class: 'PCSK9 Inhibitor', dosages: ['140mg/mL', '420mg/3.5mL'], notes: 'Injectable mAb, typically q2-4 weeks or monthly.' },
    { name: 'Inclisiran', brandNames: ['Leqvio'], type: 'lipid', class: 'PCSK9 Inhibitor', dosages: ['284mg/1.5mL'], notes: 'Injectable siRNA, initially, 3 months, then q6 months.' }, // Added
    { name: 'Fenofibrate', brandNames: ['Lipidil'], type: 'lipid', class: 'Fibrate', dosages: ['48mg', '145mg', '160mg'], notes: 'Primarily targets triglycerides.' },
    { name: 'Gemfibrozil', brandNames: ['Lopid'], type: 'lipid', class: 'Fibrate', dosages: ['600mg'], notes: 'Primarily targets triglycerides; caution with statins.' },
    { name: 'Bempedoic Acid', brandNames: ['Nexletol'], type: 'lipid', class: 'ACL Inhibitor', dosages: ['180mg'], notes: 'Alternative/add-on, often with Ezetimibe.' }, // Added

    // --- Anti-Hypertensive Medications ---
    { name: 'Ramipril', brandNames: ['Altace'], type: 'hypertensive', class: 'ACE Inhibitor', dosages: ['1.25mg', '2.5mg', '5mg', '10mg', '15mg'] },
    { name: 'Perindopril', brandNames: ['Coversyl'], type: 'hypertensive', class: 'ACE Inhibitor', dosages: ['2mg', '4mg', '8mg'] },
    { name: 'Lisinopril', brandNames: ['Zestril', 'Prinivil'], type: 'hypertensive', class: 'ACE Inhibitor', dosages: ['2.5mg', '5mg', '10mg', '20mg', '40mg'] },
    { name: 'Telmisartan', brandNames: ['Micardis'], type: 'hypertensive', class: 'ARB', dosages: ['20mg', '40mg', '80mg'] },
    { name: 'Irbesartan', brandNames: ['Avapro'], type: 'hypertensive', class: 'ARB', dosages: ['75mg', '150mg', '300mg'] },
    { name: 'Valsartan', brandNames: ['Diovan'], type: 'hypertensive', class: 'ARB', dosages: ['40mg', '80mg', '160mg', '320mg'] },
    { name: 'Amlodipine', brandNames: ['Norvasc'], type: 'hypertensive', class: 'Calcium Channel Blocker', subClass: 'Dihydropyridine', dosages: ['2.5mg', '5mg', '10mg'] },
    { name: 'Diltiazem CD', brandNames: ['Cardizem CD', 'Tiazac'], type: 'hypertensive', class: 'Calcium Channel Blocker', subClass: 'Non-Dihydropyridine', dosages: ['120mg', '180mg', '240mg', '300mg', '360mg'] },
    { name: 'Hydrochlorothiazide', brandNames: ['Microzide'], type: 'hypertensive', class: 'Diuretic', subClass: 'Thiazide', dosages: ['12.5mg', '25mg'] },
    { name: 'Chlorthalidone', brandNames: ['Hygroton'], type: 'hypertensive', class: 'Diuretic', subClass: 'Thiazide-like', dosages: ['12.5mg', '25mg', '50mg'] },
    { name: 'Indapamide', brandNames: ['Lozide'], type: 'hypertensive', class: 'Diuretic', subClass: 'Thiazide-like', dosages: ['1.25mg', '2.5mg'] },
    { name: 'Metoprolol (Succinate ER / Tartrate)', brandNames: ['Lopressor', 'Toprol-XL'], type: 'hypertensive', class: 'Beta Blocker', dosages: ['25mg', '50mg', '100mg', '200mg'] },
    { name: 'Bisoprolol', brandNames: ['Monocor'], type: 'hypertensive', class: 'Beta Blocker', dosages: ['2.5mg', '5mg', '10mg'] },
    { name: 'Atenolol', brandNames: ['Tenormin'], type: 'hypertensive', class: 'Beta Blocker', dosages: ['25mg', '50mg', '100mg'] },

    // --- Anti-Diabetic Medications ---
    { name: 'Metformin', brandNames: ['Glucophage'], type: 'diabetes', class: 'Biguanide', dosages: ['500mg', '850mg', '1000mg'] },
    { name: 'Gliclazide (MR)', brandNames: ['Diamicron MR'], type: 'diabetes', class: 'Sulfonylurea', dosages: ['30mg', '60mg'] },
    { name: 'Glibenclamide', brandNames: ['Daonil'], type: 'diabetes', class: 'Sulfonylurea', dosages: ['2.5mg', '5mg'] },
    { name: 'Sitagliptin', brandNames: ['Januvia'], type: 'diabetes', class: 'DPP-4 Inhibitor', dosages: ['25mg', '50mg', '100mg'] },
    { name: 'Saxagliptin', brandNames: ['Onglyza'], type: 'diabetes', class: 'DPP-4 Inhibitor', dosages: ['2.5mg', '5mg'] },
    { name: 'Empagliflozin', brandNames: ['Jardiance'], type: 'diabetes', class: 'SGLT2 Inhibitor', dosages: ['10mg', '25mg'], notes: 'Proven CV & renal benefits.' },
    { name: 'Dapagliflozin', brandNames: ['Forxiga'], type: 'diabetes', class: 'SGLT2 Inhibitor', dosages: ['5mg', '10mg'], notes: 'Proven CV & renal benefits.' },
    { name: 'Canagliflozin', brandNames: ['Invokana'], type: 'diabetes', class: 'SGLT2 Inhibitor', dosages: ['100mg', '300mg'], notes: 'Proven CV & renal benefits.' }, // Added
    { name: 'Ertugliflozin', brandNames: ['Steglatro'], type: 'diabetes', class: 'SGLT2 Inhibitor', dosages: ['5mg', '15mg'], notes: 'SGLT2 inhibitor.' }, // Added
    { name: 'Liraglutide', brandNames: ['Victoza'], type: 'diabetes', class: 'GLP-1 Receptor Agonist', dosages: ['0.6mg', '1.2mg', '1.8mg'], notes: 'Injectable (Daily). Proven CV benefits.' },
    { name: 'Semaglutide (SC)', brandNames: ['Ozempic'], type: 'diabetes', class: 'GLP-1 Receptor Agonist', dosages: ['0.25mg', '0.5mg', '1.0mg', '2.0mg'], notes: 'Injectable (Weekly). Proven CV benefits.' },
    { name: 'Semaglutide (Oral)', brandNames: ['Rybelsus'], type: 'diabetes', class: 'GLP-1 Receptor Agonist', dosages: ['3mg', '7mg', '14mg'], notes: 'Oral (Daily). Proven CV benefits.' },
    { name: 'Dulaglutide', brandNames: ['Trulicity'], type: 'diabetes', class: 'GLP-1 Receptor Agonist', dosages: ['0.75mg', '1.5mg', '3.0mg', '4.5mg'], notes: 'Injectable (Weekly). Proven CV benefits.' }, // Added
    { name: 'Lixisenatide', brandNames: ['Adlyxine'], type: 'diabetes', class: 'GLP-1 Receptor Agonist', dosages: ['10mcg', '20mcg'], notes: 'Injectable (Daily). Often in combo (Soliqua).' }, // Added (Note: May be less common/discontinued in some regions)
    { name: 'Tirzepatide', brandNames: ['Mounjaro'], type: 'diabetes', class: 'GIP/GLP-1 Receptor Agonist', dosages: ['2.5mg', '5mg', '7.5mg', '10mg', '12.5mg', '15mg'], notes: 'Injectable (Weekly). Dual action. Strong CV benefits.' }, // Added
    { name: 'Insulin (Various)', brandNames: ['Lantus', 'Levemir', 'Humalog', 'NovoRapid', 'etc.'], type: 'diabetes', class: 'Insulin', dosages: ['Varies'], notes: 'Many types & highly individualized dosages.' },
]);

// --- Medication Database Service (Provides Safe Access) ---
class MedicationDatabaseService {
    constructor() {
        if (MedicationDatabaseService.instance) {
            return MedicationDatabaseService.instance;
        }
        this.medications = MEDICATION_DATA;
        MedicationDatabaseService.instance = this;
        console.log("MedicationDatabaseService Initialized, Count:", this.medications.length);
    }

    /** Gets a medication by its generic name (case-insensitive). */
    getByName(name) {
        if (!name) return null;
        const lowerCaseName = name.toLowerCase();
        return this.medications.find(med => med.name.toLowerCase() === lowerCaseName) || null;
    }

    /** Gets medications by class (case-insensitive). */
    getByClass(className) {
        if (!className) return [];
        const lowerCaseClass = className.toLowerCase();
        return this.medications.filter(med => med.class.toLowerCase() === lowerCaseClass);
    }

    /** Gets medications by type. */
    getByType(type) {
        if (!type || !['lipid', 'hypertensive', 'diabetes'].includes(type.toLowerCase())) return [];
        const lowerCaseType = type.toLowerCase();
        return this.medications.filter(med => med.type.toLowerCase() === lowerCaseType);
    }

    /** Gets all medications. */
    getAll() {
        return this.medications;
    }

    /** Gets a list of names for dropdowns, optionally filtered. */
    getMedicationNames(filterType = 'all') {
        let filteredMeds = this.medications;
        if (filterType !== 'all') {
            filteredMeds = this.getByType(filterType);
        }
        return filteredMeds.map(med => med.name).sort();
    }
}

// Instantiate and export the singleton service
const MedicationDatabase = new MedicationDatabaseService();

// Optional: Make it globally accessible
// window.MedicationDatabase = MedicationDatabase;

// Use this line if using ES modules
// export default MedicationDatabase;