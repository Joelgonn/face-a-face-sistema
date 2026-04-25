// /domain/medicacao/alergia.rules.ts

// --- FAMÍLIAS DE RISCO (REGRAS DE NEGÓCIO) ---
export const FAMILIAS_DE_RISCO: Record<string, string[]> = {
  'penicilina': ['amoxicilina', 'ampicilina', 'benzilpenicilina', 'piperacilina', 'clavulanato', 'benzetacil', 'oxacilina', 'cefalexina', 'cefazolina', 'ceftriaxona', 'cefuroxima', 'cefepima', 'meropenem', 'imipenem', 'ertapenem', 'aztreonam'],
  'aines': ['ibuprofeno', 'diclofenaco', 'aspirina', 'aas', 'nimesulida', 'cetoprofeno', 'naproxeno', 'piroxicam', 'indometacina', 'celecoxib', 'etoricoxib', 'meloxicam', 'aceclofenaco', 'tenoxicam', 'nabumetona'],
  'sulfa': ['sulfametoxazol', 'trimetoprima', 'bactrim', 'sulfadiazina', 'sulfasalazina', 'sulfadoxina', 'sulfamerazina'],
  'dipirona': ['novalgina', 'lisador', 'magnopyrol', 'dipimed', 'neosaldina', 'buscofen', 'termopirona'],
  'paracetamol': ['tylenol', 'parador', 'dôrico', 'acetaminofen', 'cimegripe', 'tandrilax', 'vic'],
  'corticoides': ['prednisona', 'dexametasona', 'hidrocortisona', 'betametasona', 'metilprednisolona', 'triancinolona', 'cortisona', 'deflazacorte'],
  'ieca': ['captopril', 'enalapril', 'lisinopril', 'ramipril', 'perindopril', 'quinapril', 'fosinopril', 'benazepril'],
  'bra': ['losartan', 'valsartan', 'candesartan', 'irbesartan', 'olmesartan', 'telmisartan', 'eprosartan', 'azilsartan'],
  'estatinas': ['sinvastatina', 'atorvastatina', 'rosuvastatina', 'pravastatina', 'lovastatina', 'fluvastatina', 'pitavastatina'],
  'anticonvulsivantes': ['fenitoína', 'carbamazepina', 'valproato', 'fenobarbital', 'oxcarbazepina', 'lamotrigina', 'gabapentina', 'pregabalina', 'topiramato', 'levetiracetam'],
  'antidepressivos_ssri': ['fluoxetina', 'sertralina', 'paroxetina', 'citalopram', 'escitalopram', 'fluvoxamina'],
  'antidepressivos_triciclicos': ['amitriptilina', 'imipramina', 'clomipramina', 'nortriptilina', 'desipramina'],
  'antipsicoticos': ['haloperidol', 'clorpromazina', 'risperidona', 'quetiapina', 'olanzapina', 'aripiprazol', 'ziprasidona', 'clozapina'],
  'acoas': ['varfarina', 'acenocumarol'],
  'doacs': ['dabigatrana', 'rivaroxabana', 'apixabana', 'edoxabana'],
  'antiagregantes': ['aas', 'clopidogrel', 'ticagrelor', 'prasugrel', 'dipiridamol', 'ticlopidina'],
  'diureticos_tiazidicos': ['hidroclorotiazida', 'clortalidona', 'indapamida'],
  'diureticos_aliança': ['furosemida', 'bumetanida', 'torasemida'],
  'diureticos_poupadores': ['espironolactona', 'amilorida', 'triamtereno'],
  'betabloqueadores': ['propranolol', 'atenolol', 'metoprolol', 'carvedilol', 'bisoprolol', 'nebivolol', 'labetalol'],
  'bloqueadores_calcio': ['anlodipino', 'nifedipino', 'verapamil', 'diltiazem', 'nicardipino', 'felodipino'],
  'quimioterapicos': ['cisplatina', 'carboplatina', 'oxaliplatina', 'ciclofosfamida', 'doxorrubicina', 'vincristina', 'paclitaxel', 'docetaxel', 'metotrexato', '5-fluorouracil', 'gemcitabina'],
  'imunossupressores': ['ciclosporina', 'tacrolimo', 'sirolimo', 'micofenolato', 'azatioprina', 'leflunomida', 'metotrexato'],
  'contraste_iodado': ['iohexol', 'iopamidol', 'ioversol', 'iodixanol', 'ioxitol'],
  'laxantes_estimulantes': ['bisacodil', 'picosulfato', 'sena', 'cáscara sagrada'],
  'laxantes_osmoticos': ['lactulose', 'polietilenoglicol', 'hidróxido de magnésio'],
  'opioides': ['morfina', 'codeína', 'tramadol', 'oxicodona', 'hidromorfona', 'fentanila', 'metadona', 'buprenorfina'],
  'benzodiazepinicos': ['diazepam', 'lorazepam', 'clonazepam', 'alprazolam', 'bromazepam', 'midazolam', 'clordiazepóxido'],
  'antifungicos_azois': ['fluconazol', 'itraconazol', 'cetoconazol', 'voriconazol', 'posaconazol', 'isavuconazol'],
  'antivirais_herpes': ['aciclovir', 'valaciclovir', 'famciclovir', 'ganciclovir'],
  'antivirais_hiv': ['tenofovir', 'lamivudina', 'zidovudina', 'efavirenz', 'ritonavir', 'darunavir', 'dolutegravir', 'raltegravir'],
  'antiemeticos': ['ondansetrona', 'metoclopramida', 'domperidona', 'bromoprida', 'prometazina', 'dexametasona'],
  'broncodilatadores_beta2': ['salbutamol', 'fenoterol', 'formoterol', 'salmeterol', 'indacaterol', 'vilanterol'],
  'broncodilatadores_anticolinergicos': ['ipratrópio', 'tiotrópio', 'aclidínio', 'glicopirrônio', 'umelidínio']
}

// --- SINÔNIMOS (REGRAS DE NEGÓCIO) ---
export const SINONIMOS_MEDICAMENTOS: Record<string, string> = {
  'paracetamol': 'paracetamol',
  'acetaminofen': 'paracetamol',
  'acetaminofeno': 'paracetamol',
  'tylenol': 'paracetamol',
  'dipirona': 'dipirona',
  'novalgina': 'dipirona',
  'metamizol': 'dipirona',
  'aas': 'aspirina',
  'ácido acetilsalicílico': 'aspirina',
  'amoxil': 'amoxicilina',
  'clavulin': 'amoxicilina',
  'azitromicina': 'azitromicina',
  'zitromax': 'azitromicina',
  'enalapril': 'enalapril',
  'renitec': 'enalapril',
  'losartan': 'losartan',
  'cozaar': 'losartan',
  'omeprazol': 'omeprazol',
  'prazol': 'omeprazol',
  'sinvastatina': 'sinvastatina',
  'zocor': 'sinvastatina',
  'ibuprofeno': 'ibuprofeno',
  'advil': 'ibuprofeno',
  'alivium': 'ibuprofeno',
  'codein': 'codeína',
  'dimorf': 'morfina'
}

// --- FUNÇÃO AUXILIAR DE NORMALIZAÇÃO ---
export const normalizarTexto = (texto: string): string => {
  return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
}

// --- FUNÇÃO PURA: VERIFICAR CONFLITO DE ALERGIA ---
export type VerificarConflitoAlergiaParams = {
  alergiasPaciente: string | null
  nomeMedicamento: string
}

export const verificarConflitoAlergia = ({
  alergiasPaciente,
  nomeMedicamento
}: VerificarConflitoAlergiaParams): string | null => {
  if (!alergiasPaciente) return null

  let remedioNormalizado = normalizarTexto(nomeMedicamento)
  
  // Verificar sinônimos
  if (SINONIMOS_MEDICAMENTOS[remedioNormalizado]) {
    remedioNormalizado = SINONIMOS_MEDICAMENTOS[remedioNormalizado]
  }

  // Lista de alergias do paciente
  const listaAlergias = alergiasPaciente
    .split(/[,;]|\be\b/)
    .map(s => normalizarTexto(s))
    .filter(s => s.length > 2)

  for (const alergia of listaAlergias) {
    // Alergia direta
    if (remedioNormalizado.includes(alergia) || alergia.includes(remedioNormalizado)) {
      return `Possível alergia direta a: ${alergia.toUpperCase()}`
    }

    // Verificar famílias de risco
    for (const [familia, membros] of Object.entries(FAMILIAS_DE_RISCO)) {
      const nomeFamilia = normalizarTexto(familia)
      const membrosNormalizados = membros.map(m => normalizarTexto(m))

      // Alergia a família + medicamento da família
      if (alergia === nomeFamilia && membrosNormalizados.some(m => remedioNormalizado.includes(m))) {
        return `Risco de Grupo: ${alergia.toUpperCase()} (Família ${familia.toUpperCase()})`
      }

      // Medicamento é família + alergia na família
      if (remedioNormalizado === nomeFamilia && membrosNormalizados.some(m => alergia.includes(m))) {
        return `Risco de Grupo: ${alergia.toUpperCase()} pertence à família ${familia.toUpperCase()}`
      }

      // Ambos na mesma família (reação cruzada)
      const alergiaEstaNaLista = membrosNormalizados.some(m => alergia.includes(m) || m.includes(alergia))
      const remedioEstaNaLista = membrosNormalizados.some(m => remedioNormalizado.includes(m))
      
      if (alergiaEstaNaLista && remedioEstaNaLista) {
        return `Reação Cruzada: ${alergia.toUpperCase()} e o remédio são do grupo ${familia.toUpperCase()}`
      }
    }
  }

  return null
}