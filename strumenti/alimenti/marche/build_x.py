"""Prodotti di marca (v3.6): valori in etichetta raccolti in raw.txt (sito del produttore o scheda del supermercato online,
indirizzo accanto a ogni riga). Scrive ../scelte/x20.txt (o ../out/x20.txt nella copia di lavoro) nel formato delle righe x di gen2.py:
id|it|en|fr|es|de|unità|grammi|sinonimi|kcal|proteine|carboidrati|grassi (per 100 g o 100 ml)."""
import pathlib
H = pathlib.Path(__file__).parent
raw = {}
for l in open(H / 'raw.txt', encoding='utf8'):
    if l.startswith('#') or not l.strip(): continue
    r = l.rstrip('\n').split('|')
    raw[r[0]] = r
def num(s): return float(s.replace(',', '.')) if s not in ('-', '') else 0.0

MB = 'Mulino Bianco'
# chiave in raw.txt: (it, en, fr, es, de, unità, grammi, sinonimi)
T = [
 ('Batticuori Mulino Bianco', 'Batticuori Mulino Bianco', 'Batticuori (Mulino Bianco cocoa biscuits)', 'Batticuori (biscuits au cacao Mulino Bianco)', 'Batticuori (galletas de cacao Mulino Bianco)', 'Batticuori (Kakaokekse von Mulino Bianco)', 'biscotto', 9.8, 'mulino bianco biscotti cacao'),
 ('Biscottone Mulino Bianco', 'Biscottone Mulino Bianco', 'Biscottone (Mulino Bianco biscuits)', 'Biscottone (biscuits Mulino Bianco)', 'Biscottone (galletas Mulino Bianco)', 'Biscottone (Kekse von Mulino Bianco)', 'biscotto', 20, 'mulino bianco biscotti latte'),
 ('Girotondi Mulino Bianco', 'Girotondi Mulino Bianco', 'Girotondi (Mulino Bianco biscuits)', 'Girotondi (biscuits Mulino Bianco)', 'Girotondi (galletas Mulino Bianco)', 'Girotondi (Kekse von Mulino Bianco)', 'biscotto', 8.5, 'mulino bianco biscotti frollini'),
 ('Rigoli Mulino Bianco', 'Rigoli Mulino Bianco', 'Rigoli (Mulino Bianco milk and honey biscuits)', 'Rigoli (biscuits lait et miel Mulino Bianco)', 'Rigoli (galletas de leche y miel Mulino Bianco)', 'Rigoli (Milch-Honig-Kekse von Mulino Bianco)', 'biscotto', 7.4, 'mulino bianco biscotti miele'),
 ('Molinetti Mulino Bianco', 'Molinetti Mulino Bianco', 'Molinetti (Mulino Bianco wholegrain biscuits)', 'Molinetti (biscuits complets Mulino Bianco)', 'Molinetti (galletas integrales Mulino Bianco)', 'Molinetti (Vollkornkekse von Mulino Bianco)', 'biscotto', 15, 'mulino bianco biscotti integrali'),
 ('Campagnole Mulino Bianco', 'Campagnole Mulino Bianco', 'Campagnole (Mulino Bianco biscuits)', 'Campagnole (biscuits Mulino Bianco)', 'Campagnole (galletas Mulino Bianco)', 'Campagnole (Kekse von Mulino Bianco)', 'biscotto', 16, 'mulino bianco biscotti'),
 ('Spicchi di Sole Mulino Bianco', 'Spicchi di Sole Mulino Bianco', 'Spicchi di Sole (Mulino Bianco biscuits)', 'Spicchi di Sole (biscuits Mulino Bianco)', 'Spicchi di Sole (galletas Mulino Bianco)', 'Spicchi di Sole (Kekse von Mulino Bianco)', 'biscotto', 11.8, 'mulino bianco biscotti'),
 ('Cuor di Mela Mulino Bianco', 'Cuor di Mela Mulino Bianco', 'Cuor di Mela (Mulino Bianco apple-filled biscuits)', 'Cuor di Mela (biscuits fourrés à la pomme Mulino Bianco)', 'Cuor di Mela (galletas rellenas de manzana Mulino Bianco)', 'Cuor di Mela (Kekse mit Apfelfüllung von Mulino Bianco)', 'biscotto', 11.5, 'mulino bianco biscotti mela'),
 ('Primizie Mulino Bianco', 'Primizie Mulino Bianco', 'Primizie (Mulino Bianco wholegrain biscuits)', 'Primizie (biscuits complets Mulino Bianco)', 'Primizie (galletas integrales Mulino Bianco)', 'Primizie (Vollkornkekse von Mulino Bianco)', 'biscotto', 12, 'mulino bianco biscotti integrali'),
 ('Cornetti classici Mulino Bianco', 'Cornetti classici Mulino Bianco', 'Plain croissant (Mulino Bianco)', 'Croissant nature (Mulino Bianco)', 'Cruasán clásico (Mulino Bianco)', 'Croissant natur (Mulino Bianco)', 'cornetto', 40, 'mulino bianco merendine croissant brioche'),
 ("Cornetti all'albicocca Mulino Bianco", "Cornetti all'albicocca Mulino Bianco", 'Apricot croissant (Mulino Bianco)', "Croissant à l'abricot (Mulino Bianco)", 'Cruasán de albaricoque (Mulino Bianco)', 'Aprikosen-Croissant (Mulino Bianco)', 'cornetto', 50, 'mulino bianco merendine croissant brioche marmellata'),
 ('Cornetti alla crema Mulino Bianco', 'Cornetti alla crema Mulino Bianco', 'Custard croissant (Mulino Bianco)', 'Croissant à la crème (Mulino Bianco)', 'Cruasán de crema (Mulino Bianco)', 'Croissant mit Cremefüllung (Mulino Bianco)', 'cornetto', 50, 'mulino bianco merendine croissant brioche'),
 ('Plumcake gocce di cioccolato Mulino Bianco', 'Plumcake gocce di cioccolato Mulino Bianco', 'Chocolate chip plumcake (Mulino Bianco)', 'Cake aux pépites de chocolat (Mulino Bianco)', 'Plumcake con pepitas de chocolate (Mulino Bianco)', 'Rührkuchen mit Schokostückchen (Mulino Bianco)', 'pezzo', 35, 'mulino bianco merendine'),
 ('Nastrine al cioccolato Mulino Bianco', 'Nastrine al cioccolato Mulino Bianco', 'Nastrine chocolate pastry (Mulino Bianco)', 'Nastrine au chocolat (Mulino Bianco)', 'Nastrine de chocolate (Mulino Bianco)', 'Nastrine mit Schokolade (Mulino Bianco)', 'pezzo', 40, 'mulino bianco merendine brioche'),
 ('Pancake Mulino Bianco', 'Pancake Mulino Bianco', 'Pancakes (Mulino Bianco)', 'Pancakes (Mulino Bianco)', 'Tortitas (Mulino Bianco)', 'Pancakes (Mulino Bianco)', 'porzione', 63.5, 'mulino bianco colazione'),
 ('Pan Goccioli Mulino Bianco', 'Pan Goccioli Mulino Bianco', 'Pan Goccioli (Mulino Bianco chocolate chip buns)', 'Pan Goccioli (petits pains aux pépites de chocolat Mulino Bianco)', 'Pan Goccioli (panecillos con chocolate Mulino Bianco)', 'Pan Goccioli (Brötchen mit Schokostückchen von Mulino Bianco)', 'pezzo', 42, 'mulino bianco merendine'),
 ('Trancino Mulino Bianco', 'Trancino Mulino Bianco', 'Trancino (Mulino Bianco sponge snack cake)', 'Trancino (génoise Mulino Bianco)', 'Trancino (bizcocho Mulino Bianco)', 'Trancino (Biskuitkuchen von Mulino Bianco)', 'merendina', 33, 'mulino bianco merendine'),
 ('Camille Mulino Bianco', 'Camille Mulino Bianco', 'Camille (Mulino Bianco carrot cakes)', 'Camille (gâteaux à la carotte Mulino Bianco)', 'Camille (bizcochos de zanahoria Mulino Bianco)', 'Camille (Karottenküchlein von Mulino Bianco)', 'merendina', 38, 'mulino bianco merendine carote'),
 ('Crostatina al cacao Mulino Bianco', 'Crostatina al cacao Mulino Bianco', 'Cocoa cream tartlet (Mulino Bianco)', 'Tartelette à la crème au cacao (Mulino Bianco)', 'Tartaleta de crema de cacao (Mulino Bianco)', 'Kakaocreme-Törtchen (Mulino Bianco)', 'merendina', 40, 'mulino bianco merendine crostatine'),
 ('Pan Bauletto bianco Mulino Bianco', 'Pan Bauletto bianco Mulino Bianco', 'Pan Bauletto white sandwich bread (Mulino Bianco)', 'Pan Bauletto pain de mie blanc (Mulino Bianco)', 'Pan Bauletto pan de molde blanco (Mulino Bianco)', 'Pan Bauletto weißes Kastenbrot (Mulino Bianco)', 'fetta', 25, 'mulino bianco pane in cassetta pancarre'),
 ('Pan Bauletto integrale Mulino Bianco', 'Pan Bauletto integrale Mulino Bianco', 'Pan Bauletto wholemeal sandwich bread (Mulino Bianco)', 'Pan Bauletto pain de mie complet (Mulino Bianco)', 'Pan Bauletto pan de molde integral (Mulino Bianco)', 'Pan Bauletto Vollkorn-Kastenbrot (Mulino Bianco)', 'fetta', 25, 'mulino bianco pane in cassetta pancarre'),
 ('Pan Bauletto al grano duro Mulino Bianco', 'Pan Bauletto al grano duro Mulino Bianco', 'Pan Bauletto durum wheat sandwich bread (Mulino Bianco)', 'Pan Bauletto pain de mie au blé dur (Mulino Bianco)', 'Pan Bauletto pan de molde de trigo duro (Mulino Bianco)', 'Pan Bauletto Hartweizen-Kastenbrot (Mulino Bianco)', 'fetta', 25, 'mulino bianco pane in cassetta semola'),
 ('PanCarrè Mulino Bianco', 'PanCarrè Mulino Bianco', 'PanCarrè toast bread (Mulino Bianco)', 'PanCarrè pain de mie (Mulino Bianco)', 'PanCarrè pan de molde (Mulino Bianco)', 'PanCarrè Toastbrot (Mulino Bianco)', 'fetta', 17.8, 'mulino bianco pancarre pane per toast'),
 ('PanCarrè integrale Mulino Bianco', 'PanCarrè integrale Mulino Bianco', 'PanCarrè wholemeal toast bread (Mulino Bianco)', 'PanCarrè pain de mie complet (Mulino Bianco)', 'PanCarrè pan de molde integral (Mulino Bianco)', 'PanCarrè Vollkorn-Toastbrot (Mulino Bianco)', 'fetta', 19.7, 'mulino bianco pancarre pane per toast'),
 ('Cracker salati Mulino Bianco', 'Cracker salati Mulino Bianco', 'Salted crackers (Mulino Bianco)', 'Crackers salés (Mulino Bianco)', 'Crackers salados (Mulino Bianco)', 'Gesalzene Cracker (Mulino Bianco)', 'pacchetto', 25, 'mulino bianco crackers sfoglia di grano'),
 ('Cracker non salati Mulino Bianco', 'Cracker non salati Mulino Bianco', 'Unsalted-top crackers (Mulino Bianco)', 'Crackers non salés en surface (Mulino Bianco)', 'Crackers sin sal en la superficie (Mulino Bianco)', 'Cracker ohne Salzkörner (Mulino Bianco)', 'pacchetto', 25, 'mulino bianco crackers'),
 ('Cracker integrali Mulino Bianco', 'Cracker integrali Mulino Bianco', 'Wholemeal crackers (Mulino Bianco)', 'Crackers complets (Mulino Bianco)', 'Crackers integrales (Mulino Bianco)', 'Vollkorncracker (Mulino Bianco)', 'pacchetto', 25, 'mulino bianco crackers'),
 ('Fette biscottate integrali Mulino Bianco', 'Fette biscottate integrali Mulino Bianco', 'Wholemeal rusks (Mulino Bianco)', 'Biscottes complètes (Mulino Bianco)', 'Biscotes integrales (Mulino Bianco)', 'Vollkorn-Zwieback (Mulino Bianco)', 'fetta', 8.8, 'mulino bianco fette biscottate'),
 ('Fette biscottate rigate Mulino Bianco', 'Fette biscottate rigate Mulino Bianco', 'Rusks (Mulino Bianco Rigate)', 'Biscottes (Mulino Bianco Rigate)', 'Biscotes (Mulino Bianco Rigate)', 'Zwieback (Mulino Bianco Rigate)', 'fetta', 9.8, 'mulino bianco fette biscottate'),
 ('Dolcifette Mulino Bianco', 'Dolcifette Mulino Bianco', 'Dolcifette sweet rusks (Mulino Bianco)', 'Dolcifette biscottes sucrées (Mulino Bianco)', 'Dolcifette biscotes dulces (Mulino Bianco)', 'Dolcifette süßer Zwieback (Mulino Bianco)', 'fetta', 9.8, 'mulino bianco fette biscottate'),
 ('Grissini Torinesi Mulino Bianco', 'Grissini Torinesi Mulino Bianco', 'Torinesi breadsticks (Mulino Bianco)', 'Gressins Torinesi (Mulino Bianco)', 'Picos Torinesi (Mulino Bianco)', 'Grissini Torinesi (Mulino Bianco)', 'porzione', 25, 'mulino bianco grissini'),
 ('Pangrì classici Mulino Bianco', 'Pangrì classici Mulino Bianco', 'Pangrì bread snacks (Mulino Bianco)', 'Pangrì (Mulino Bianco)', 'Pangrì (Mulino Bianco)', 'Pangrì Brotsnacks (Mulino Bianco)', 'porzione', 20, 'mulino bianco grissini'),
 ('Merenda Pan di Stelle', 'Merenda Pan di Stelle', 'Pan di Stelle snack cake', 'Goûter Pan di Stelle', 'Merienda Pan di Stelle', 'Pan di Stelle Kuchensnack', 'merendina', 35, 'mulino bianco merendine cacao'),
 ('Crema Pan di Stelle', 'Crema Pan di Stelle', 'Pan di Stelle spread', 'Pâte à tartiner Pan di Stelle', 'Crema para untar Pan di Stelle', 'Pan di Stelle Aufstrich', 'cucchiaino', 15, 'crema spalmabile cacao nocciole mulino bianco'),
 # Barilla
 ('Pesto alla genovese Barilla', 'Pesto alla genovese Barilla', 'Pesto alla genovese (Barilla)', 'Pesto alla genovese (Barilla)', 'Pesto genovés (Barilla)', 'Pesto alla genovese (Barilla)', 'cucchiaio', 15, 'pesto barilla sugo'),
 ('Sugo con basilico Barilla', 'Sugo al basilico Barilla', 'Basilico tomato sauce (Barilla)', 'Sauce tomate au basilic (Barilla)', 'Salsa de tomate con albahaca (Barilla)', 'Tomatensauce mit Basilikum (Barilla)', '', 0, 'sugo pronto pomodoro barilla'),
 ("Sugo all'arrabbiata Barilla", "Sugo all'arrabbiata Barilla", 'Arrabbiata sauce (Barilla)', 'Sauce arrabbiata (Barilla)', 'Salsa arrabbiata (Barilla)', 'Arrabbiata-Sauce (Barilla)', '', 0, 'sugo pronto piccante barilla'),
 ('Ragù alla bolognese Barilla', 'Ragù alla bolognese Barilla', 'Bolognese ragù (Barilla)', 'Ragù à la bolognaise (Barilla)', 'Ragú a la boloñesa (Barilla)', 'Ragù alla bolognese (Barilla)', '', 0, 'sugo pronto ragu barilla'),
 # Rio Mare, Simmenthal
 ("Tonno Rio Mare all'olio di oliva", "Tonno Rio Mare all'olio di oliva (con l'olio)", 'Rio Mare tuna in olive oil (with the oil)', "Thon Rio Mare à l'huile d'olive (avec l'huile)", 'Atún Rio Mare en aceite de oliva (con el aceite)', 'Rio Mare Thunfisch in Olivenöl (mit Öl)', 'scatoletta', 80, "rio mare tonno sott'olio scatoletta"),
 ("Tonno Rio Mare filod'olio", "Tonno Rio Mare filod'olio (con l'olio)", "Rio Mare filod'olio tuna (with the oil)", "Thon Rio Mare filod'olio (avec l'huile)", "Atún Rio Mare filod'olio (con el aceite)", "Rio Mare Thunfisch filod'olio (mit Öl)", 'scatoletta', 65, "rio mare tonno sott'olio scatoletta"),
 ('Tonno Rio Mare Leggero', "Tonno Rio Mare Leggero (con l'olio)", 'Rio Mare Leggero tuna (with the oil)', "Thon Rio Mare Leggero (avec l'huile)", 'Atún Rio Mare Leggero (con el aceite)', 'Rio Mare Thunfisch Leggero (mit Öl)', 'scatoletta', 60, "rio mare tonno sott'olio scatoletta light"),
 ('Tonno Rio Mare al naturale (sgocciolato)', 'Tonno Rio Mare al naturale (sgocciolato)', 'Rio Mare tuna in brine (drained)', 'Thon Rio Mare au naturel (égoutté)', 'Atún Rio Mare al natural (escurrido)', 'Rio Mare Thunfisch naturell (abgetropft)', 'scatoletta', 56, 'rio mare tonno al naturale scatoletta'),
 ('Insalatissime Rio Mare alla messicana', 'Insalatissime Rio Mare alla messicana', 'Rio Mare Insalatissime Mexican salad with tuna', 'Insalatissime Rio Mare à la mexicaine (salade au thon)', 'Insalatissime Rio Mare a la mexicana (ensalada con atún)', 'Insalatissime Rio Mare mexikanisch (Salat mit Thunfisch)', 'confezione', 160, 'rio mare insalata tonno pronta'),
 ('Insalatissime Rio Mare cous cous', 'Insalatissime Rio Mare cous cous', 'Rio Mare Insalatissime couscous with tuna', 'Insalatissime Rio Mare couscous au thon', 'Insalatissime Rio Mare cuscús con atún', 'Insalatissime Rio Mare Couscous mit Thunfisch', 'confezione', 200, 'rio mare insalata tonno pronta couscous'),
 ('Simmenthal la Classica', 'Simmenthal la Classica', 'Simmenthal beef in jelly', 'Simmenthal bœuf en gelée', 'Simmenthal carne de vacuno en gelatina', 'Simmenthal Rindfleisch in Aspik', 'scatoletta', 140, 'carne in scatola gelatina manzo'),
 # Galbani e formaggi
 ('Mozzarella Santa Lucia Galbani', 'Mozzarella Santa Lucia Galbani', 'Santa Lucia mozzarella (Galbani)', 'Mozzarella Santa Lucia (Galbani)', 'Mozzarella Santa Lucia (Galbani)', 'Mozzarella Santa Lucia (Galbani)', 'confezione', 125, 'galbani mozzarella'),
 ('Mozzarella Santa Lucia La Leggera Galbani', 'Mozzarella Santa Lucia La Leggera Galbani', 'Santa Lucia La Leggera light mozzarella (Galbani)', 'Mozzarella allégée Santa Lucia La Leggera (Galbani)', 'Mozzarella ligera Santa Lucia La Leggera (Galbani)', 'Leichte Mozzarella Santa Lucia La Leggera (Galbani)', 'confezione', 125, 'galbani mozzarella light'),
 ('Ricotta Santa Lucia Galbani', 'Ricotta Santa Lucia Galbani', 'Santa Lucia ricotta (Galbani)', 'Ricotta Santa Lucia (Galbani)', 'Ricotta Santa Lucia (Galbani)', 'Ricotta Santa Lucia (Galbani)', '', 0, 'galbani ricotta'),
 ('Fiocchi di latte Santa Lucia Galbani', 'Fiocchi di latte Santa Lucia Galbani', 'Santa Lucia cottage cheese (Galbani)', 'Cottage cheese Santa Lucia (Galbani)', 'Requesón Santa Lucia (Galbani)', 'Hüttenkäse Santa Lucia (Galbani)', 'confezione', 180, 'galbani fiocchi di latte cottage'),
 ('Certosa Galbani', 'Certosa Galbani', 'Certosa soft cheese (Galbani)', 'Certosa fromage frais (Galbani)', 'Certosa queso fresco (Galbani)', 'Certosa Weichkäse (Galbani)', 'confezione', 165, 'galbani stracchino crescenza'),
 ('Philadelphia Original', 'Philadelphia Original', 'Philadelphia Original cream cheese', 'Philadelphia Original fromage à tartiner', 'Philadelphia Original queso crema', 'Philadelphia Original Frischkäse', 'porzione', 30, 'formaggio spalmabile formaggio fresco'),
 ('Philadelphia Light', 'Philadelphia Light', 'Philadelphia Light cream cheese', 'Philadelphia Light fromage à tartiner', 'Philadelphia Light queso crema', 'Philadelphia Light Frischkäse', 'porzione', 30, 'formaggio spalmabile formaggio fresco'),
 ('Sottilette Classiche', 'Sottilette Classiche', 'Sottilette processed cheese slices', 'Sottilette tranches de fromage fondu', 'Sottilette lonchas de queso fundido', 'Sottilette Schmelzkäsescheiben', 'fetta', 28.6, 'formaggio fuso a fette kraft'),
 # yogurt e latte
 ('Müller Bianco crema di yogurt', 'Müller yogurt bianco cremoso', 'Müller creamy plain yogurt', 'Müller yaourt nature crémeux', 'Müller yogur natural cremoso', 'Müller cremiger Naturjoghurt', 'vasetto', 125, 'muller yogurt bianco'),
 ('Müller Zero% bianco', 'Müller Zero% yogurt bianco', 'Müller Zero% plain yogurt', 'Müller Zero% yaourt nature', 'Müller Zero% yogur natural', 'Müller Zero% Naturjoghurt', 'vasetto', 125, 'muller yogurt magro'),
 ('Müller Passione alla Greca bianco', 'Müller Passione alla Greca bianco', 'Müller Passione alla Greca plain Greek-style yogurt', 'Müller Passione alla Greca yaourt à la grecque nature', 'Müller Passione alla Greca yogur griego natural', 'Müller Passione alla Greca Joghurt griechischer Art natur', 'vasetto', 150, 'muller yogurt greco'),
 ('Müller Mix Bisco Crunch', 'Müller Mix Bisco Crunch', 'Müller Mix Bisco Crunch yogurt', 'Müller Mix Bisco Crunch yaourt', 'Müller Mix Bisco Crunch yogur', 'Müller Mix Bisco Crunch Joghurt', 'vasetto', 150, 'muller yogurt'),
 ('Activia bianco naturale', 'Activia bianco naturale', 'Activia plain yogurt', 'Activia nature', 'Activia natural', 'Activia Naturjoghurt', 'vasetto', 125, 'danone yogurt bianco'),
 ('Activia 0% grassi bianco naturale', 'Activia 0% grassi bianco naturale', 'Activia 0% fat plain yogurt', 'Activia 0% nature', 'Activia 0% natural', 'Activia 0% Naturjoghurt', 'vasetto', 125, 'danone yogurt magro'),
 ('Danette al cioccolato', 'Danette al cioccolato', 'Danette chocolate pudding', 'Danette au chocolat', 'Danette de chocolate', 'Danette Schokoladenpudding', 'vasetto', 125, 'danone budino cioccolato dessert'),
 ('HiPRO yogurt vaniglia', 'HiPRO yogurt vaniglia', 'HiPRO vanilla protein yogurt', 'HiPRO yaourt protéiné vanille', 'HiPRO yogur proteico vainilla', 'HiPRO Proteinjoghurt Vanille', 'vasetto', 160, 'danone yogurt proteico proteine'),
 ('Skyr Danone bianco', 'Skyr Danone bianco', 'Danone plain skyr', 'Skyr nature Danone', 'Skyr natural Danone', 'Danone Skyr natur', '', 0, 'skyr yogurt proteico'),
 ('Fage Total 0%', 'Fage Total 0%', 'Fage Total 0% Greek yogurt', 'Fage Total 0% yaourt grec', 'Fage Total 0% yogur griego', 'Fage Total 0% griechischer Joghurt', 'vasetto', 150, 'yogurt greco magro'),
 ('Fage Total 2%', 'Fage Total 2%', 'Fage Total 2% Greek yogurt', 'Fage Total 2% yaourt grec', 'Fage Total 2% yogur griego', 'Fage Total 2% griechischer Joghurt', 'vasetto', 150, 'yogurt greco'),
 ('Fage Total 5%', 'Fage Total 5%', 'Fage Total 5% Greek yogurt', 'Fage Total 5% yaourt grec', 'Fage Total 5% yogur griego', 'Fage Total 5% griechischer Joghurt', 'vasetto', 150, 'yogurt greco intero'),
 ('Latte Zymil senza lattosio magro', 'Latte Zymil senza lattosio scremato', 'Zymil lactose-free skimmed milk', 'Lait écrémé sans lactose Zymil', 'Leche desnatada sin lactosa Zymil', 'Zymil laktosefreie Magermilch', 'bicchiere', 200, 'parmalat latte senza lattosio'),
 ('Latte Accadì Granarolo senza lattosio 1%', 'Latte Accadì Granarolo senza lattosio 1%', 'Granarolo Accadì lactose-free milk 1% fat', 'Lait sans lactose Accadì Granarolo 1 %', 'Leche sin lactosa Accadì Granarolo 1 %', 'Granarolo Accadì laktosefreie Milch 1 %', 'bicchiere', 200, 'granarolo latte senza lattosio'),
 # carne, pesce, piatti pronti
 ('Wudy AIA classico', 'Wudy AIA classico', 'AIA Wudy chicken and turkey frankfurters', 'Saucisses Wudy AIA poulet et dinde', 'Salchichas Wudy AIA de pollo y pavo', 'AIA Wudy Würstchen aus Huhn und Pute', '', 0, 'wurstel würstel pollo tacchino aia'),
 ('Petto di pollo cotto al forno Amadori', 'Petto di pollo cotto al forno Amadori', 'Amadori oven-roasted chicken breast', 'Blanc de poulet rôti au four Amadori', 'Pechuga de pollo al horno Amadori', 'Amadori ofengegarte Hähnchenbrust', 'confezione', 100, 'amadori pollo affettato'),
 ('Tortellini Giovanni Rana Sfogliavelo al prosciutto crudo (crudi)', 'Tortellini al prosciutto crudo Giovanni Rana (crudi)', 'Giovanni Rana prosciutto tortellini (uncooked)', 'Tortellini au jambon cru Giovanni Rana (crus)', 'Tortellini de jamón curado Giovanni Rana (crudos)', 'Giovanni Rana Tortellini mit Rohschinken (ungekocht)', 'porzione', 125, 'rana pasta fresca ripiena sfogliavelo'),
 ('Tortelloni Giovanni Rana ricotta e spinaci (crudi)', 'Tortelloni ricotta e spinaci Giovanni Rana (crudi)', 'Giovanni Rana ricotta and spinach tortelloni (uncooked)', 'Tortelloni ricotta et épinards Giovanni Rana (crus)', 'Tortelloni de ricotta y espinacas Giovanni Rana (crudos)', 'Giovanni Rana Tortelloni mit Ricotta und Spinat (ungekocht)', 'porzione', 125, 'rana pasta fresca ripiena'),
 ('Sofficini Findus pomodoro e mozzarella', 'Sofficini Findus pomodoro e mozzarella', 'Findus Sofficini tomato and mozzarella', 'Sofficini Findus tomate et mozzarella', 'Sofficini Findus tomate y mozzarella', 'Findus Sofficini Tomate und Mozzarella', 'pezzo', 62.5, 'findus surgelati'),
 ('Fiori di merluzzo Capitan Findus', 'Fiori di merluzzo Capitan Findus', 'Capitan Findus cod fillets', 'Filets de cabillaud Capitan Findus', 'Filetes de bacalao Capitan Findus', 'Capitan Findus Kabeljaufilets', 'pezzo', 75, 'findus merluzzo surgelati pesce'),
 ('Pizza Regina Cameo margherita', 'Pizza Regina Cameo margherita', 'Cameo Regina frozen margherita pizza', 'Pizza margherita surgelée Cameo Regina', 'Pizza margarita congelada Cameo Regina', 'Cameo Regina Tiefkühlpizza Margherita', 'pizza intera', 310, 'pizza surgelata cameo'),
 ('Pizza Bella Napoli Buitoni margherita', 'Pizza Bella Napoli Buitoni margherita', 'Buitoni Bella Napoli frozen margherita pizza', 'Pizza margherita surgelée Buitoni Bella Napoli', 'Pizza margarita congelada Buitoni Bella Napoli', 'Buitoni Bella Napoli Tiefkühlpizza Margherita', 'pizza intera', 365, 'pizza surgelata buitoni'),
 # pomodoro, salse, creme
 ('Passata di pomodoro Mutti', 'Passata di pomodoro Mutti', 'Mutti tomato passata', 'Coulis de tomates Mutti', 'Tomate triturado Mutti (passata)', 'Mutti passierte Tomaten', '', 0, 'mutti passata pomodoro'),
 ('Polpa di pomodoro Mutti', 'Polpa di pomodoro Mutti', 'Mutti chopped tomatoes', 'Pulpe de tomates Mutti', 'Pulpa de tomate Mutti', 'Mutti stückige Tomaten', '', 0, 'mutti pomodoro a pezzi'),
 ('Ketchup Heinz', 'Ketchup Heinz', 'Heinz tomato ketchup', 'Ketchup Heinz', 'Kétchup Heinz', 'Heinz Tomatenketchup', 'cucchiaio', 15, 'heinz ketchup salsa'),
 ('Nocciolata Rigoni di Asiago', 'Nocciolata Rigoni di Asiago', 'Nocciolata hazelnut cocoa spread (Rigoni di Asiago)', 'Nocciolata pâte à tartiner (Rigoni di Asiago)', 'Nocciolata crema de cacao y avellanas (Rigoni di Asiago)', 'Nocciolata Nuss-Nougat-Aufstrich (Rigoni di Asiago)', 'cucchiaino', 15, 'crema spalmabile nocciole cacao rigoni'),
 # snack salati
 ('Patatine San Carlo classiche', 'Patatine San Carlo classiche', 'San Carlo classic crisps', 'Chips San Carlo classiques', 'Patatas fritas San Carlo clásicas', 'San Carlo klassische Kartoffelchips', 'pacchetto', 25, 'san carlo patatine chips'),
 ('Patatine San Carlo Rustica', 'Patatine San Carlo Rustica', 'San Carlo Rustica crisps', 'Chips San Carlo Rustica', 'Patatas fritas San Carlo Rustica', 'San Carlo Rustica Kartoffelchips', 'porzione', 25, 'san carlo patatine chips rustiche'),
 ('Patatine San Carlo 1936', 'Patatine San Carlo 1936', 'San Carlo 1936 crisps', 'Chips San Carlo 1936', 'Patatas fritas San Carlo 1936', 'San Carlo 1936 Kartoffelchips', 'pacchetto', 25, 'san carlo patatine chips'),
 ('Patatine Amica Chips Sapore di sale', 'Patatine Amica Chips Sapore di sale', 'Amica Chips salted crisps', 'Chips Amica Chips salées', 'Patatas fritas Amica Chips con sal', 'Amica Chips gesalzene Kartoffelchips', '', 0, 'amica chips patatine'),
 ('Doritos Tex-Mex', 'Doritos Tex-Mex', 'Doritos Tex-Mex tortilla chips', 'Doritos Tex-Mex chips de maïs', 'Doritos Tex-Mex', 'Doritos Tex-Mex Tortillachips', 'porzione', 30, 'doritos nachos tortilla chips'),
 ('Sfoglie Gran Pavesi classiche', 'Sfoglie Gran Pavesi classiche', 'Gran Pavesi Sfoglie baked crackers', 'Sfoglie Gran Pavesi (crackers cuits au four)', 'Sfoglie Gran Pavesi (crackers horneados)', 'Gran Pavesi Sfoglie Backsnack', 'pacchetto', 30, 'pavesi snack salati'),
 # biscotti e dolci
 ('Il GranTurchese Colussi', 'GranTurchese Colussi', 'Colussi GranTurchese biscuits', 'Biscuits GranTurchese Colussi', 'Galletas GranTurchese Colussi', 'Colussi GranTurchese Kekse', 'biscotto', 6.7, 'colussi biscotti gran turchese'),
 ('Bucaneve Doria', 'Bucaneve Doria', 'Doria Bucaneve biscuits', 'Biscuits Bucaneve Doria', 'Galletas Bucaneve Doria', 'Doria Bucaneve Kekse', 'biscotto', 7.5, 'doria biscotti'),
 ('Gocciole Extra Dark Pavesi', 'Gocciole Extra Dark Pavesi', 'Pavesi Gocciole Extra Dark biscuits', 'Biscuits Gocciole Extra Dark Pavesi', 'Galletas Gocciole Extra Dark Pavesi', 'Pavesi Gocciole Extra Dark Kekse', 'biscotto', 12, 'pavesi biscotti gocce cioccolato fondente'),
 ('Fette biscottate integrali Misura Fibrextra', 'Fette biscottate integrali Misura Fibrextra', 'Misura Fibrextra wholemeal rusks', 'Biscottes complètes Misura Fibrextra', 'Biscotes integrales Misura Fibrextra', 'Misura Fibrextra Vollkorn-Zwieback', 'fetta', 8.9, 'misura fette biscottate'),
 ('Biscotto Plasmon', 'Biscotto Plasmon', 'Plasmon baby biscuit', 'Biscuit Plasmon', 'Galleta Plasmon', 'Plasmon Kinderkeks', '', 0, 'plasmon biscotti bambini'),
 ('Quadratini Loacker Napolitaner', 'Quadratini Loacker Napolitaner', 'Loacker Quadratini Napolitaner wafers', 'Gaufrettes Quadratini Loacker Napolitaner', 'Barquillos Quadratini Loacker Napolitaner', 'Loacker Quadratini Napolitaner Waffeln', '', 0, 'loacker wafer nocciola'),
 ('Wafer Loacker Classic Napolitaner', 'Wafer Loacker Classic Napolitaner', 'Loacker Classic Napolitaner wafer', 'Gaufrette Loacker Classic Napolitaner', 'Barquillo Loacker Classic Napolitaner', 'Loacker Classic Napolitaner Waffel', 'pacchetto', 45, 'loacker wafer nocciola'),
 ('Mix Max Balconi', 'Mix Max Balconi', 'Balconi Mix Max snack cake', 'Goûter Mix Max Balconi', 'Pastelito Mix Max Balconi', 'Balconi Mix Max Kuchensnack', 'merendina', 35, 'balconi merendine'),
 ('Croissant classico Bauli', 'Croissant classico Bauli', 'Bauli plain croissant', 'Croissant nature Bauli', 'Cruasán clásico Bauli', 'Bauli Croissant natur', 'cornetto', 40, 'bauli cornetto merendine'),
 ('Kinder Colazione Più integrale', 'Kinder Colazione Più integrale', 'Kinder Colazione Più wholegrain', 'Kinder Colazione Più complet', 'Kinder Colazione Più integral', 'Kinder Colazione Più Vollkorn', 'merendina', 29, 'ferrero kinder merendine'),
 ('Ritter Sport nocciole intere', 'Ritter Sport nocciole intere', 'Ritter Sport whole hazelnuts', 'Ritter Sport noisettes entières', 'Ritter Sport avellanas enteras', 'Ritter Sport Ganze Haselnüsse', '', 0, 'cioccolato al latte nocciole tavoletta'),
 ('Barretta Fitness cioccolato', 'Barretta Fitness cioccolato', 'Fitness chocolate cereal bar (Nestlé)', 'Barre de céréales Fitness chocolat (Nestlé)', 'Barrita de cereales Fitness chocolate (Nestlé)', 'Fitness Schoko-Müsliriegel (Nestlé)', 'barretta', 23.5, 'nestle barretta cereali'),
 # gelati
 ('Maxibon Classic', 'Maxibon Classic', 'Maxibon Classic ice cream sandwich', 'Maxibon Classic', 'Maxibon Classic', 'Maxibon Classic', 'pezzo', 96, 'motta nestle gelato'),
 ('Magnum White Chocolate', 'Magnum White Chocolate', 'Magnum White Chocolate', 'Magnum White Chocolate', 'Magnum White Chocolate', 'Magnum White Chocolate', 'stecco', 73.5, 'algida gelato magnum bianco'),
 # cereali
 ("Kellogg's Krave Choco Nut", "Kellogg's Krave Choco Nut", "Kellogg's Krave Choco Nut", "Kellogg's Krave Choco Nut", "Kellogg's Krave Choco Nut", "Kellogg's Krave Choco Nut", 'porzione', 30, 'kelloggs cereali cioccolato nocciole'),
 ("Coco Pops Risetti Kellogg's", "Coco Pops Kellogg's", "Kellogg's Coco Pops", "Kellogg's Coco Pops", "Kellogg's Coco Pops", "Kellogg's Coco Pops", 'porzione', 30, 'kelloggs cereali riso soffiato cacao risetti'),
 ('Fitness cioccolato fondente Nestlé', 'Fitness cioccolato fondente Nestlé', 'Nestlé Fitness dark chocolate cereal', 'Céréales Fitness chocolat noir Nestlé', 'Cereales Fitness chocolate negro Nestlé', 'Nestlé Fitness Zartbitter-Cerealien', 'porzione', 30, 'nestle cereali integrali'),
 ('Nesquik cereali palline', 'Nesquik cereali', 'Nesquik cereal', 'Céréales Nesquik', 'Cereales Nesquik', 'Nesquik Cerealien', 'porzione', 30, 'nestle cereali cacao palline'),
 ('Nesquik cacao solubile', 'Nesquik cacao solubile (in polvere)', 'Nesquik cocoa drink powder', 'Nesquik cacao en poudre', 'Nesquik cacao soluble', 'Nesquik Kakaopulver', 'porzione', 13.5, 'nestle cacao in polvere latte'),
 # bevande (per 100 ml)
 ('Pepsi', 'Pepsi', 'Pepsi', 'Pepsi', 'Pepsi', 'Pepsi', 'lattina', 330, 'pepsi cola bibita'),
 ('Pepsi Zero Zucchero', 'Pepsi Zero Zucchero', 'Pepsi Zero Sugar', 'Pepsi Zéro sucre', 'Pepsi Zero Azúcar', 'Pepsi Zero Zucker', 'lattina', 330, 'pepsi cola zero bibita'),
 ('Monster Energy Ultra White', 'Monster Energy Ultra White', 'Monster Energy Ultra White', 'Monster Energy Ultra White', 'Monster Energy Ultra White', 'Monster Energy Ultra White', 'lattina', 500, 'monster energy drink zero'),
 ('Fuze Tea pesca e rosa', 'Fuze Tea pesca e rosa', 'Fuze Tea peach and rose', 'Fuze Tea pêche et rose', 'Fuze Tea melocotón y rosa', 'Fuze Tea Pfirsich und Rose', 'bicchiere', 200, 'tè freddo te alla pesca'),
 ('Santàl ACE', 'Santàl ACE', 'Santàl ACE juice drink', 'Santàl ACE (jus)', 'Santàl ACE (zumo)', 'Santàl ACE Saft', 'bicchiere', 200, 'succo di frutta ace arancia carota limone parmalat'),
 ('Yoga pesca', 'Yoga pesca', 'Yoga peach juice', 'Jus de pêche Yoga', 'Zumo de melocotón Yoga', 'Yoga Pfirsichsaft', 'bicchiere', 200, 'succo di frutta pesca'),
]
BEER = [
 ('Birra Moretti', 'Birra Moretti', 'Birra Moretti beer', 'Bière Birra Moretti', 'Cerveza Birra Moretti', 'Birra Moretti Bier', 'bottiglia', 330, 'birra moretti'),
 ('Birra Peroni Nastro Azzurro', 'Birra Peroni Nastro Azzurro', 'Peroni Nastro Azzurro beer', 'Bière Peroni Nastro Azzurro', 'Cerveza Peroni Nastro Azzurro', 'Peroni Nastro Azzurro Bier', 'bottiglia', 330, 'birra peroni'),
 ('Birra Heineken', 'Birra Heineken', 'Heineken beer', 'Bière Heineken', 'Cerveza Heineken', 'Heineken Bier', 'lattina', 330, 'birra heineken'),
 ('Birra Corona Extra', 'Birra Corona Extra', 'Corona Extra beer', 'Bière Corona Extra', 'Cerveza Corona Extra', 'Corona Extra Bier', 'bottiglia', 330, 'birra corona'),
]
out, miss = [], []
for pre, lst in (('xb', T), ('xa', BEER)):
    for n, (key, it, en, fr, es, de, u, gr, syn) in enumerate(lst, 1):
        r = raw.get(key)
        if not r: miss.append(key); continue
        k, g, c, fi, p = (num(x) for x in r[1:6])
        i = f'{pre}{n:03d}'  # xb = prodotti di marca, xa = alcolici (kcal anche dall'alcol)
        gr2 = int(gr) if gr == int(gr) else gr
        out.append('|'.join(map(str, (i, it, en, fr, es, de, u, gr2, syn, k, p, c, g))))
used = {t[0] for t in T + BEER}
print('righe', len(out), '| mancano in raw:', miss, '| in raw non usate:', [k for k in raw if k not in used])
(H.parent / ('scelte' if (H.parent / 'scelte').exists() else 'out') / 'x20.txt').write_text('\n'.join(out) + '\n', encoding='utf8')
