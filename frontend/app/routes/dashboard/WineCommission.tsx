import React, { useState, useMemo, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select as SelectUI, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, GlassWater, Search, Calendar, RefreshCcw, Minus, Plus, Trash2, User, FileText, Wine, Edit3, XCircle, CheckCircle2, PlusCircle, ArrowUpDown, X, ChevronDown, ChevronUp, ReceiptText } from "lucide-react";
import { fetchData, postData, updateData, deleteData } from "@/lib/fetch-util";

const wineData = [
  {"id": "W22", "name": "RƯỢU MAKER'S MARK", "price": 2000000, "unit": "CHAI/BOTTLE", "code": "MXRINK80"},
  {"id": "W49", "name": "RƯỢU JOHNNIE WALKER BLUE LABEL", "price": 8000000, "unit": "CHAI/BOTTLE", "code": "MXRINK68"},
  {"id": "W190", "name": "Rượu sâm G-Tiso 19% ( Glass )", "price": 180000, "unit": "LY/GLASS", "code": "MXLRS04"},
  {"id": "W39", "name": "RƯỢU BOWMORE 15", "price": 4800000, "unit": "CHAI/BOTTLE", "code": "MXRINK45"},
  {"id": "W140", "name": "RƯỢU Umeshu Kodawari Mi-Iri Nakata / 720ML / 12%", "price": 1600000, "unit": "CHAI/BOTTLE", "code": "MXRINK161"},
  {"id": "W191", "name": "RƯỢU JOSE CUREVO REPOSADO", "price": 1200000, "unit": "CHAI/BOTTLE", "code": "MXRINK20"},
  {"id": "W24", "name": "RƯỢU MACALLAN 15 DOUBLE CASK", "price": 860000, "unit": "LY/GLASS", "code": "MXRINK75"},
  {"id": "W93", "name": "RƯỢU Villa Maria, Private Bin Sauvignon, Marlborough, Sauvignon Blanc", "price": 1100000, "unit": "CHAI/BOTTLE", "code": "MXRINK141"},
  {"id": "W31", "name": "RƯỢU GLENFIDDICH 15", "price": 520000, "unit": "LY/GLASS", "code": "MXRINK59"},
  {"id": "W41", "name": "RƯỢU CHIVAS MINUZARA", "price": 255000, "unit": "LY/GLASS", "code": "MXRINK50"},
  {"id": "W192", "name": "RƯỢU BELDEVERE", "price": 2200000, "unit": "CHAI/BOTTLE", "code": "MXRINK30"},
  {"id": "W79", "name": "RƯỢU Alvaro Palacios, La Vendimia, Garnacha/ Tempranillo", "price": 1100000, "unit": "CHAI/BOTTLE", "code": "MXRINK105"},
  {"id": "W43", "name": "RƯỢU CHIVAS REGAL 18 BLUE SIGNATURE", "price": 350000, "unit": "LY/GLASS", "code": "MXRINK54"},
  {"id": "W82", "name": "RƯỢU Trimbach, Gewurztraminer, Alsace", "price": 1700000, "unit": "CHAI/BOTTLE", "code": "MXRINK138"},
  {"id": "W53", "name": "RƯỢU MATSUI KURAYOSHI 8YO", "price": 6000000, "unit": "CHAI/BOTTLE", "code": "MXRINK82"},
  {"id": "W100", "name": "RƯỢU CHAMPAGNE Delamotte, Brut,France", "price": 2500000, "unit": "CHAI/BOTTLE", "code": "MXRINK143"},
  {"id": "W117", "name": "RƯỢU SAKE Dassai 39 16% -300ml", "price": 950000, "unit": "CHAI/BOTTLE", "code": "MXRINK152"},
  {"id": "W47", "name": "RƯỢU BALLANTINE 21", "price": 5200000, "unit": "CHAI/BOTTLE", "code": "MXRINK38"},
  {"id": "W193", "name": "RƯỢU CHIVAS REGAL 18 BLUE SIGNATURE", "price": 3800000, "unit": "CHAI/BOTTLE", "code": "MXRINK55"},
  {"id": "W68", "name": "RƯỢU Chateau Hyon la Fleur,Merlot / Cabernet Sauvignon", "price": 4000000, "unit": "CHAI/BOTTLE", "code": "MXRINK108"},
  {"id": "W107", "name": "RƯỢU CHAMPAGNE Tribaut Schloesser 750ml, 12-15%", "price": 2600000, "unit": "CHAI/BOTTLE", "code": "MXRINK149"},
  {"id": "W194", "name": "Rượu sâm Hercule 40%", "price": 3100000, "unit": "CHAI/BOTTLE", "code": "MXRS08"},
  {"id": "W195", "name": "RƯỢU MARTELL X.O", "price": 8800000, "unit": "CHAI/BOTTLE", "code": "MXRINK13"},
  {"id": "W94", "name": "RƯỢU Rimapere by Baron Edmond de Rothschild", "price": 1400000, "unit": "CHAI/BOTTLE", "code": "MXRINK136"},
  {"id": "W38", "name": "RƯỢU BOWMORE 12", "price": 2500000, "unit": "CHAI/BOTTLE", "code": "MXRINK43"},
  {"id": "W45", "name": "RƯỢU CHIVAS REGAL 25", "price": 10500000, "unit": "CHAI/BOTTLE", "code": "MXRINK56"},
  {"id": "W119", "name": "RƯỢU SAKE Dassai 23 16% -720ml", "price": 3800000, "unit": "CHAI/BOTTLE", "code": "MXRINK151"},
  {"id": "W3", "name": "RƯỢU ABSOLUTE ELYX 1L", "price": 3400000, "unit": "CHAI/BOTTLE", "code": "MXRINK28"},
  {"id": "W92", "name": "RƯỢU Vidal Estate by Villa Maria, Sauvignon Blanc, Malborough Valley", "price": 900000, "unit": "CHAI/BOTTLE", "code": "MXRINK140"},
  {"id": "W4", "name": "RƯỢU GREY GOOSE", "price": 2200000, "unit": "CHAI/BOTTLE", "code": "MXRINK26"},
  {"id": "W32", "name": "RƯỢU GLENFIDDICH 18", "price": 6200000, "unit": "CHAI/BOTTLE", "code": "MXRINK62"},
  {"id": "W59", "name": "RƯỢU HENNESSY X.O", "price": 780000, "unit": "LY/GLASS", "code": "MXRINK17"},
  {"id": "W52", "name": "RƯỢU MATSUI MIZUNARA CASK", "price": 680000, "unit": "LY/GLASS", "code": "MXRINK83"},
  {"id": "W28", "name": "RƯỢU THE GLENLIVET 18", "price": 580000, "unit": "LY/GLASS", "code": "MXRINK95"},
  {"id": "W12", "name": "RƯỢU KRAKEN", "price": 210000, "unit": "LY/GLASS", "code": "MXRINK3"},
  {"id": "W196", "name": "Rượu sâm Victoria 34%", "price": 3100000, "unit": "CHAI/BOTTLE", "code": "MXRS07"},
  {"id": "W76", "name": "RƯỢU Cum Laude - Banfi Toscana, Italy", "price": 1900000, "unit": "CHAI/BOTTLE", "code": "MXRINK118"},
  {"id": "W197", "name": "RƯỢU ABSOLUTE ELYX 1L", "price": 380000, "unit": "LY/GLASS", "code": "MXRINK27"},
  {"id": "W63", "name": "RƯỢU Chateau Clinet, Pomerol, Bordeaux Blend", "price": 6800000, "unit": "CHAI/BOTTLE", "code": "MXRINK107"},
  {"id": "W11", "name": "RƯỢU KINGSTON 62 WHITE", "price": 150000, "unit": "LY/GLASS", "code": "MXRINK1"},
  {"id": "W30", "name": "RƯỢU THE GLENLIVET 25", "price": 20000000, "unit": "CHAI/BOTTLE", "code": "MXRINK97"},
  {"id": "W198", "name": "RƯỢU JOHNNIE WALKER BLUE LABEL", "price": 860000, "unit": "LY/GLASS", "code": "MXRINK67"},
  {"id": "W99", "name": "RƯỢU Bottega, Millesimato Brut, Spumante Bianco,Veneto, Italy", "price": 900000, "unit": "CHAI/BOTTLE", "code": "MXRINK142"},
  {"id": "W199", "name": "Rượu sâm HK 19% ( Glass )", "price": 150000, "unit": "LY/GLASS", "code": "MXLRS01"},
  {"id": "W90", "name": "RƯỢU Torres, Vina Esmeralda Semi Dry White, Gewurztraminer Moscato", "price": 900000, "unit": "CHAI/BOTTLE", "code": "MXRINK137"},
  {"id": "W106", "name": "RƯỢU CHAMPAGNE Salon, Le Mesnil Blanc de Blancs, France", "price": 45000000, "unit": "CHAI/BOTTLE", "code": "MXRINK146"},
  {"id": "W66", "name": "RƯỢU Chateau Malescot St Exupery, Margaux 3rd Grand Cru Classe, Bordeaux Blend", "price": 5000000, "unit": "CHAI/BOTTLE", "code": "MXRINK110"},
  {"id": "W95", "name": "RƯỢU Gunderloch, \"Fritz\" ,Riesling", "price": 1000000, "unit": "CHAI/BOTTLE", "code": "MXRINK132"},
  {"id": "W73", "name": "RƯỢU Ronan By Chateau Clinet,Merlot", "price": 1200000, "unit": "CHAI/BOTTLE", "code": "MXRINK125"},
  {"id": "W40", "name": "RƯỢU BOWMORE 18", "price": 680000, "unit": "LY/GLASS", "code": "MXRINK46"},
  {"id": "W14", "name": "RƯỢU 1800 CRISTALINO", "price": 380000, "unit": "LY/GLASS", "code": "MXRINK22"},
  {"id": "W21", "name": "RƯỢU JACK DANIEL", "price": 1500000, "unit": "CHAI/BOTTLE", "code": "MXRINK66"},
  {"id": "W20", "name": "RƯỢU WILD TURKEY 8 YEAR", "price": 250000, "unit": "LY/GLASS", "code": "MXRINK102"},
  {"id": "W188B", "name": "RƯỢU SAKE Kubota Junmai Daiginjo 15% 720ml", "price": 1500000, "unit": "CHAI/BOTTLE", "code": "MXRINK156"},
  {"id": "W200", "name": "RƯỢU MATSUI MIZUNARA CASK", "price": 6000000, "unit": "CHAI/BOTTLE", "code": "MXRINK84"},
  {"id": "W51", "name": "RƯỢU NAKED MALT", "price": 2000000, "unit": "CHAI/BOTTLE", "code": "MXRINK86"},
  {"id": "W2", "name": "RƯỢU HAKU", "price": 210000, "unit": "LY/GLASS", "code": "MXRINK33"},
  {"id": "W201", "name": "RƯỢU BELDEVERE", "price": 275000, "unit": "LY/GLASS", "code": "MXRINK29"},
  {"id": "W55", "name": "RƯỢU HIBIKI HARMONY", "price": 650000, "unit": "LY/GLASS", "code": "MXRINK63"},
  {"id": "W202", "name": "Rượu sâm Victoria 34% ( Glass )", "price": 330000, "unit": "LY/GLASS", "code": "MXLRS07"},
  {"id": "W78", "name": "RƯỢU Masi Costasera, Amarone della Valpolicella Classico DOCG,Corvina/ Rondinella /Molinara,Italy", "price": 3800000, "unit": "CHAI/BOTTLE", "code": "MXRINK122"},
  {"id": "W103", "name": "RƯỢU CHAMPAGNE Taittinger, Prelude Grands Crus Brut, France", "price": 5200000, "unit": "CHAI/BOTTLE", "code": "MXRINK148"},
  {"id": "W203", "name": "RƯỢU THE GLENLIVET 18", "price": 6800000, "unit": "CHAI/BOTTLE", "code": "MXRINK96"},
  {"id": "W142", "name": "RƯỢU SAKE Kubota Senju Ginjo 15% 300ml", "price": 500000, "unit": "CHAI/BOTTLE", "code": "MXRINK157"},
  {"id": "W37", "name": "RƯỢU LAPHROAIG 10", "price": 2700000, "unit": "CHAI/BOTTLE", "code": "MXRINK72"},
  {"id": "W204", "name": "Rượu sâm Thiên thần 19%", "price": 1300000, "unit": "CHAI/BOTTLE", "code": "MXRS02"},
  {"id": "W205", "name": "RƯỢU JOSE CUREVO REPOSADO", "price": 155000, "unit": "LY/GLASS", "code": "MXRINK19"},
  {"id": "W15", "name": "RƯỢU CLASE AZUL REPOSADO", "price": 10000000, "unit": "CHAI/BOTTLE", "code": "MXRINK24"},
  {"id": "W136", "name": "RƯỢU SAKE Snow aged Junmai Daiginjo 3 years Hakkaisan (Yukimuro)17% (720ml)", "price": 3600000, "unit": "CHAI/BOTTLE", "code": "MXRINK160"},
  {"id": "W206", "name": "RƯỢU SMIRNOFF", "price": 900000, "unit": "CHAI/BOTTLE", "code": "MXRINK32"},
  {"id": "W58", "name": "RƯỢU HENNESSY VSOP", "price": 320000, "unit": "LY/GLASS", "code": "MXRINK15"},
  {"id": "W10", "name": "RƯỢU KINOBI KYOTO", "price": 310000, "unit": "LY/GLASS", "code": "MXRINK9"},
  {"id": "W207", "name": "RƯỢU 1800 CRISTALINO", "price": 3200000, "unit": "CHAI/BOTTLE", "code": "MXRINK23"},
  {"id": "W208", "name": "RƯỢU GLENFIDDICH 18", "price": 680000, "unit": "LY/GLASS", "code": "MXRINK61"},
  {"id": "W209", "name": "Rượu sâm Hercule 40% ( Glass )", "price": 330000, "unit": "LY/GLASS", "code": "MXLRS08"},
  {"id": "W19", "name": "RƯỢU BULLEIT", "price": 180000, "unit": "LY/GLASS", "code": "MXRINK48"},
  {"id": "W80", "name": "RƯỢU Concha Y Toro, Gran Reserva, Carmenere", "price": 250000, "unit": "LY/GLASS", "code": "MXRINK116"},
  {"id": "W188A", "name": "RƯỢU SAKE Kubota Senju Ginjo 15% 720ml", "price": 1000000, "unit": "CHAI/BOTTLE", "code": "MXRINK158"},
  {"id": "W210", "name": "RƯỢU BALLANTINE 21", "price": 480000, "unit": "LY/GLASS", "code": "MXRINK37"},
  {"id": "W91", "name": "RƯỢU Concha Y Toro, Marques De Casa Concha Chardonnay", "price": 1400000, "unit": "CHAI/BOTTLE", "code": "MXRINK128"},
  {"id": "W6", "name": "RƯỢU TANQUERAY", "price": 2000000, "unit": "CHAI/BOTTLE", "code": "MXRINK8"},
  {"id": "W211", "name": "RƯỢU NAKED MALT", "price": 250000, "unit": "LY/GLASS", "code": "MXRINK85"},
  {"id": "W212", "name": "Rượu sâm Khai vị 19%", "price": 1800000, "unit": "CHAI/BOTTLE", "code": "MXRS06"},
  {"id": "W72", "name": "RƯỢU Louis Jadot, Cote de Beaune Villages, Pinot Noir", "price": 2000000, "unit": "CHAI/BOTTLE", "code": "MXRINK120"},
  {"id": "W57", "name": "RƯỢU THE HAKUSHU DISTILLERS RESERVE", "price": 6000000, "unit": "CHAI/BOTTLE", "code": "MXRINK99"},
  {"id": "W213", "name": "RƯỢU MATSUI KURAYOSHI 8YO", "price": 680000, "unit": "LY/GLASS", "code": "MXRINK81"},
  {"id": "W214", "name": "RƯỢU JACK DANIEL", "price": 120000, "unit": "LY/GLASS", "code": "MXRINK65"},
  {"id": "W56", "name": "RƯỢU THE YAMAZAKI DISTILLERS RESERVE", "price": 770000, "unit": "LY/GLASS", "code": "MXRINK100"},
  {"id": "W215", "name": "RƯỢU SMIRNOFF", "price": 110000, "unit": "LY/GLASS", "code": "MXRINK31"},
  {"id": "W216", "name": "RƯỢU TANQUERAY", "price": 210000, "unit": "LY/GLASS", "code": "MXRINK7"},
  {"id": "W217", "name": "RƯỢU CHIVAS MINUZARA", "price": 2000000, "unit": "CHAI/BOTTLE", "code": "MXRINK51"},
  {"id": "W23", "name": "RƯỢU MACALLAN 12 SHERRY CASK", "price": 480000, "unit": "LY/GLASS", "code": "MXRINK73"},
  {"id": "W118", "name": "RƯỢU SAKE Dassai 39 16% -720ml", "price": 1900000, "unit": "CHAI/BOTTLE", "code": "MXRINK153"},
  {"id": "W7", "name": "RƯỢU ROKU", "price": 210000, "unit": "LY/GLASS", "code": "MXRINK11"},
  {"id": "W81", "name": "RƯỢU La Joya Gran Reserva Syrah", "price": 900000, "unit": "CHAI/BOTTLE", "code": "MXRINK119"},
  {"id": "W218", "name": "RƯỢU WILD TURKEY 8 YEAR", "price": 2000000, "unit": "CHAI/BOTTLE", "code": "MXRINK103"},
  {"id": "W9", "name": "RƯỢU HENDRICK'S", "price": 2200000, "unit": "CHAI/BOTTLE", "code": "MXRINK6"},
  {"id": "W219", "name": "Rượu sâm Khai vị 19% ( Glass )", "price": 180000, "unit": "LY/GLASS", "code": "MXLRS06"},
  {"id": "W189", "name": "RƯỢU Vang F Negroamaro", "price": 1800000, "unit": "CHAI/BOTTLE", "code": "MXRINK126"},
  {"id": "W220", "name": "Rượu sâm Premium 34%", "price": 2000000, "unit": "CHAI/BOTTLE", "code": "MXRS05"},
  {"id": "W221", "name": "RƯỢU Concha Y Toro, Gran Reserva, Carmenere", "price": 1200000, "unit": "CHAI/BOTTLE", "code": "MXRINK117"},
  {"id": "W222", "name": "RƯỢU HENNESSY X.O", "price": 8900000, "unit": "CHAI/BOTTLE", "code": "MXRINK18"},
  {"id": "W62", "name": "RƯỢU Chateau Palmer 2008, Margaux 3rd Grand Cru Classe, Merlot/ Cabernet Sauvignon", "price": 18000000, "unit": "CHAI/BOTTLE", "code": "MXRINK112"},
  {"id": "W223", "name": "Rượu sâm Tố nữ 19%", "price": 1700000, "unit": "CHAI/BOTTLE", "code": "MXRS03"},
  {"id": "W50", "name": "RƯỢU JOHNNIE WALKER DOUBLE BLACK", "price": 220000, "unit": "LY/GLASS", "code": "MXRINK69"},
  {"id": "W224", "name": "RƯỢU GLENFIDDICH 15", "price": 3900000, "unit": "CHAI/BOTTLE", "code": "MXRINK60"},
  {"id": "W27", "name": "RƯỢU THE GLENLIVET 15", "price": 4100000, "unit": "CHAI/BOTTLE", "code": "MXRINK94"},
  {"id": "W26", "name": "RƯỢU THE GLENLIVET 12", "price": 280000, "unit": "LY/GLASS", "code": "MXRINK91"},
  {"id": "W225", "name": "RƯỢU KRAKEN", "price": 220000, "unit": "CHAI/BOTTLE", "code": "MXRINK4"},
  {"id": "W226", "name": "RƯỢU ROKU", "price": 2200000, "unit": "CHAI/BOTTLE", "code": "MXRINK12"},
  {"id": "W227", "name": "Rượu sâm G-Tiso 19%", "price": 1800000, "unit": "CHAI/BOTTLE", "code": "MXRS04"},
  {"id": "W25", "name": "RƯỢU MACALLAN 18 DOUBLE CASK", "price": 1800000, "unit": "LY/GLASS", "code": "MXRINK77"},
  {"id": "W101", "name": "RƯỢU CHAMPAGNE J.M. Labruyere, Prologue, Grand Cru,France", "price": 3500000, "unit": "CHAI/BOTTLE", "code": "MXRINK145"},
  {"id": "W64", "name": "RƯỢU Pauillac De Chateau Latour, Bordeaux Blend", "price": 6200000, "unit": "CHAI/BOTTLE", "code": "MXRINK124"},
  {"id": "W77", "name": "RƯỢU Castello Banfi, Brunello di Montalcino DOCG, Sangiovese,Italy", "price": 3800000, "unit": "CHAI/BOTTLE", "code": "MXRINK106"},
  {"id": "W228", "name": "Rượu sâm Thiên thần 19% ( Glass )", "price": 150000, "unit": "LY/GLASS", "code": "MXLRS02"},
  {"id": "W229", "name": "RƯỢU HIBIKI HARMONY", "price": 5200000, "unit": "CHAI/BOTTLE", "code": "MXRINK64"},
  {"id": "W230", "name": "RƯỢU BOWMORE 15", "price": 460000, "unit": "LY/GLASS", "code": "MXRINK44"},
  {"id": "W33", "name": "RƯỢU BALVENIE 14", "price": 680000, "unit": "LY/GLASS", "code": "MXRINK40"},
  {"id": "W89", "name": "RƯỢU D' Arenberg, The Olive Grove, Chardonnay", "price": 1300000, "unit": "CHAI/BOTTLE", "code": "MXRINK129"},
  {"id": "W231", "name": "RƯỢU HENDRICK'S", "price": 210000, "unit": "LY/GLASS", "code": "MXRINK5"},
  {"id": "W83", "name": "RƯỢU Guigal, Cotes du Rhone, Rhone Blend", "price": 1400000, "unit": "CHAI/BOTTLE", "code": "MXRINK131"},
  {"id": "W65", "name": "RƯỢU Chateau Larcis Ducasse, St. Emilion 1st Grand Cru Classe, Bordeaux Blend", "price": 5700000, "unit": "CHAI/BOTTLE", "code": "MXRINK109"},
  {"id": "W232", "name": "RƯỢU BOWMORE 12", "price": 250000, "unit": "LY/GLASS", "code": "MXRINK42"},
  {"id": "W233", "name": "RƯỢU THE GLENLIVET 15", "price": 380000, "unit": "LY/GLASS", "code": "MXRINK93"},
  {"id": "W234", "name": "RƯỢU THE GLENLIVET 12", "price": 2900000, "unit": "CHAI/BOTTLE", "code": "MXRINK92"},
  {"id": "W44", "name": "RƯỢU CHIVAS ROYAL SALUTE 21", "price": 680000, "unit": "LY/GLASS", "code": "MXRINK57"},
  {"id": "W42", "name": "RƯỢU CHIVAS MINUZARA 18", "price": 490000, "unit": "LY/GLASS", "code": "MXRINK52"},
  {"id": "W235", "name": "RƯỢU HAKU", "price": 2000000, "unit": "CHAI/BOTTLE", "code": "MXRINK34"},
  {"id": "W71", "name": "RƯỢU Chateau Saint Andre, Montagne Saint Emilion, Merlot/ Cab Sauvignon", "price": 1900000, "unit": "CHAI/BOTTLE", "code": "MXRINK115"},
  {"id": "W46", "name": "RƯỢU BALLANTINE 17", "price": 350000, "unit": "LY/GLASS", "code": "MXRINK35"},
  {"id": "W236", "name": "RƯỢU CHIVAS MINUZARA 18", "price": 3900000, "unit": "CHAI/BOTTLE", "code": "MXRINK53"},
  {"id": "W105", "name": "RƯỢU Comtes De CHAMPAGNE Grands Crus - Blanc de blanc", "price": 12500000, "unit": "CHAI/BOTTLE", "code": "MXRINK150"},
  {"id": "W36", "name": "RƯỢU SINGLETON 15", "price": 3900000, "unit": "CHAI/BOTTLE", "code": "MXRINK90"},
  {"id": "W237", "name": "Rượu sâm HK 19%", "price": 1200000, "unit": "CHAI/BOTTLE", "code": "MXRS01"},
  {"id": "W238", "name": "RƯỢU Roux Pere, Fils Meursault", "price": 6700000, "unit": "CHAI/BOTTLE", "code": "MXRINK135"},
  {"id": "W239", "name": "RƯỢU GREY GOOSE", "price": 250000, "unit": "LY/GLASS", "code": "MXRINK25"},
  {"id": "W240", "name": "RƯỢU BALVENIE 14", "price": 6200000, "unit": "CHAI/BOTTLE", "code": "MXRINK41"},
  {"id": "W241", "name": "RƯỢU JOHNNIE WALKER DOUBLE BLACK", "price": 2200000, "unit": "CHAI/BOTTLE", "code": "MXRINK70"},
  {"id": "W17", "name": "RƯỢU DON JULIO 1942", "price": 10000000, "unit": "CHAI/BOTTLE", "code": "MXRINK21"},
  {"id": "W102", "name": "RƯỢU CHAMPAGNE Taittinger, Brut Prestige Rose, France", "price": 4800000, "unit": "CHAI/BOTTLE", "code": "MXRINK147"},
  {"id": "W74", "name": "RƯỢU Maison Castel, Merlot, Bordeaux", "price": 900000, "unit": "CHAI/BOTTLE", "code": "MXRINK121"},
  {"id": "W242", "name": "RƯỢU Vidal Estate by Villa Maria, Sauvignon Blanc, Malborough Valley", "price": 200000, "unit": "LY/GLASS", "code": "MXRINK139"},
  {"id": "W243", "name": "RƯỢU MACALLAN 12 SHERRY CASK", "price": 5200000, "unit": "CHAI/BOTTLE", "code": "MXRINK74"},
  {"id": "W244", "name": "RƯỢU SAKE Kubota Junmai Daiginjo 15% 300ml", "price": 600000, "unit": "CHAI/BOTTLE", "code": "MXRINK155"},
  {"id": "W60", "name": "RƯỢU MARTELL CORDON BLEU", "price": 7200000, "unit": "CHAI/BOTTLE", "code": "MXRINK14"},
  {"id": "W245", "name": "RƯỢU THE HAKUSHU DISTILLERS RESERVE", "price": 720000, "unit": "LY/GLASS", "code": "MXRINK98"},
  {"id": "W246", "name": "RƯỢU BOWMORE 18", "price": 7500000, "unit": "CHAI/BOTTLE", "code": "MXRINK47"},
  {"id": "W75", "name": "RƯỢU Opus One 2019, Cabernet Sauvignon", "price": 20000000, "unit": "CHAI/BOTTLE", "code": "MXRINK123"},
  {"id": "W48", "name": "RƯỢU BALLANTINE 30", "price": 11000000, "unit": "CHAI/BOTTLE", "code": "MXRINK39"},
  {"id": "W70", "name": "RƯỢU Chateau Mont Redon, Chateauneuf du Pape, Grenache / Syrah/ Mourvedre", "price": 2900000, "unit": "CHAI/BOTTLE", "code": "MXRINK111"},
  {"id": "W35", "name": "RƯỢU SINGLETON 12", "price": 2500000, "unit": "CHAI/BOTTLE", "code": "MXRINK88"},
  {"id": "W247", "name": "RƯỢU SINGLETON 15", "price": 460000, "unit": "LY/GLASS", "code": "MXRINK89"},
  {"id": "W87", "name": "RƯỢU Louis Jadot, Pouilly Fuisse, Chardonnay", "price": 2800000, "unit": "CHAI/BOTTLE", "code": "MXRINK134"},
  {"id": "W248", "name": "RƯỢU MAKER'S MARK", "price": 250000, "unit": "LY/GLASS", "code": "MXRINK79"},
  {"id": "W249", "name": "RƯỢU LAPHROAIG 10", "price": 340000, "unit": "LY/GLASS", "code": "MXRINK71"},
  {"id": "W85", "name": "RƯỢU Henri Bourgeois, 'En Travertin', Pouilly Fume, Sauvignon Blanc", "price": 1700000, "unit": "CHAI/BOTTLE", "code": "MXRINK133"},
  {"id": "W84", "name": "RƯỢU Domaine Huet, Clos du Bourg \"Demi Sec\", Chenin Blanc", "price": 3800000, "unit": "CHAI/BOTTLE", "code": "MXRINK130"},
  {"id": "W69", "name": "RƯỢU Chateau Prieure Lichine, Margaux 4th Grand Cru Classe, Bordeaux Blend", "price": 4100000, "unit": "CHAI/BOTTLE", "code": "MXRINK113"},
  {"id": "W88", "name": "RƯỢU Clay Creek Chardonnay", "price": 1200000, "unit": "CHAI/BOTTLE", "code": "MXRINK127"},
  {"id": "W250", "name": "RƯỢU MACALLAN 15 DOUBLE CASK", "price": 8000000, "unit": "CHAI/BOTTLE", "code": "MXRINK76"},
  {"id": "W251", "name": "RƯỢU HENNESSY VSOP", "price": 2900000, "unit": "CHAI/BOTTLE", "code": "MXRINK16"},
  {"id": "W252", "name": "Rượu sâm Tố nữ 19% ( Glass )", "price": 180000, "unit": "LY/GLASS", "code": "MXLRS03"},
  {"id": "W253", "name": "RƯỢU BALLANTINE 17", "price": 3200000, "unit": "CHAI/BOTTLE", "code": "MXRINK36"},
  {"id": "W254", "name": "RƯỢU BULLEIT", "price": 1900000, "unit": "CHAI/BOTTLE", "code": "MXRINK49"},
  {"id": "W255", "name": "RƯỢU KINGSTON 62 WHITE", "price": 1200000, "unit": "CHAI/BOTTLE", "code": "MXRINK2"},
  {"id": "W115", "name": "RƯỢU SAKE Dassai 45 16% -300ml", "price": 650000, "unit": "CHAI/BOTTLE", "code": "MXRINK154"},
  {"id": "W256", "name": "RƯỢU KINOBI KYOTO", "price": 3200000, "unit": "CHAI/BOTTLE", "code": "MXRINK10"},
  {"id": "W257", "name": "RƯỢU MACALLAN 18 DOUBLE CASK", "price": 16000000, "unit": "CHAI/BOTTLE", "code": "MXRINK78"},
  {"id": "W258", "name": "RƯỢU THE YAMAZAKI DISTILLERS RESERVE", "price": 6200000, "unit": "CHAI/BOTTLE", "code": "MXRINK101"},
  {"id": "W259", "name": "RƯỢU CHIVAS ROYAL SALUTE 21", "price": 5800000, "unit": "CHAI/BOTTLE", "code": "MXRINK58"},
  {"id": "W260", "name": "Rượu sâm Premium 34% ( Glass )", "price": 210000, "unit": "LY/GLASS", "code": "MXLRS05"},
  {"id": "W261", "name": "RƯỢU SINGLETON 12", "price": 310000, "unit": "LY/GLASS", "code": "MXRINK87"},
  {"id": "W104", "name": "RƯỢU CHAMPAGNE G.H Mumm Grand Cordon", "price": 2800000, "unit": "CHAI/BOTTLE", "code": "MXRINK144"},
  {"id": "W67", "name": "RƯỢU Chateau Rouget, Pomerol, Bordeaux Blend", "price": 4500000, "unit": "CHAI/BOTTLE", "code": "MXRINK114"}
];

const resolveUnit = (item: any) => {
  const staticWine = wineData.find(w => w.id === item.wineId);
  if (staticWine && staticWine.unit) return staticWine.unit;
  if (item.unit) return item.unit;
  return "CHAI/BOTTLE";
};

const isGlassUnit = (unit?: string) => !!unit && /ly|glass/i.test(unit);
const isBottleUnit = (unit?: string) => !!unit && /chai|bottle/i.test(unit);

export default function WineCommissionPage() {
  const monthPickerRef = useRef<HTMLInputElement>(null);

  const [masterStaff, setMasterStaff] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const [editId, setEditId] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [staffName, setStaffName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [billItems, setBillItems] = useState<any[]>([]);

  const [wineSearch, setWineSearch] = useState("");
  const [showWineDropdown, setShowWineDropdown] = useState(false);

  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customWineName, setCustomWineName] = useState("");
  const [customWinePrice, setCustomWinePrice] = useState("");
  const [customWineUnit, setCustomWineUnit] = useState<"CHAI/BOTTLE" | "LY/GLASS" | "KHÁC">("CHAI/BOTTLE");

  // State để lưu trạng thái đóng/mở chi tiết của từng nhân viên
  const [expandedStaff, setExpandedStaff] = useState<Record<string, boolean>>({});

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [staffRes, billsRes]: [any, any] = await Promise.all([
        fetchData("/staff"),
        fetchData(`/wine-commission?month=${selectedMonth}`)
      ]);
      setMasterStaff((staffRes.data || staffRes || []).filter((s: any) => s.department === "FOH"));
      setBills(billsRes.data || billsRes || []);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { loadData(); }, [selectedMonth]);

  const currentCalculations = useMemo(() => {
    let total = 0; let hasVip = false;
    billItems.forEach(i => {
      total += (i.price * i.quantity);
      if (i.price >= 10000000) hasVip = true;
    });
    let comm = 0;
    if (hasVip) comm = total * 0.1;
    else {
      if (total >= 10000000) comm = 500000;
      else if (total >= 5000000) comm = 300000;
      else if (total >= 3000000) comm = 100000;
    }
    return { totalBill: total, commission: comm, hasVip };
  }, [billItems]);

  const formatVND = (num: number) => Math.round(num).toLocaleString("vi-VN") + "đ";

  const handleSelectWine = (wine: any) => {
    const existing = billItems.findIndex(i => i.wineId === wine.id);
    if (existing >= 0) {
      const newItems = [...billItems];
      newItems[existing].quantity += 1;
      setBillItems(newItems);
    } else {
      setBillItems([...billItems, {
        wineId: wine.id,
        wineName: wine.name,
        price: wine.price,
        quantity: 1,
        unit: wine.unit || "CHAI/BOTTLE",
      }]);
    }
    setWineSearch(""); 
    setShowWineDropdown(false);
    setShowAddCustom(false);
  };

  const handleAddCustomWine = () => {
    const name = customWineName.trim();
    const priceNum = parseInt(customWinePrice.replace(/[^0-9]/g, ""), 10);
    if (!name) return alert("Vui lòng nhập tên món!");
    if (!priceNum || priceNum <= 0) return alert("Vui lòng nhập giá hợp lệ!");
    const newWine = {
      id: `CUSTOM_${Date.now()}`,
      name,
      price: priceNum,
      unit: customWineUnit,
    };
    handleSelectWine(newWine);
    setCustomWineName("");
    setCustomWinePrice("");
    setCustomWineUnit("CHAI/BOTTLE");
  };

  const handleChangeItemQty = (index: number, delta: number) => {
    const newItems = [...billItems];
    newItems[index].quantity += delta;
    if (newItems[index].quantity <= 0) {
      newItems.splice(index, 1);
    }
    setBillItems(newItems);
  };

  const handleSaveBill = async () => {
    if (!staffName || billItems.length === 0) return alert("Thiếu tên nhân viên hoặc rượu!");
    const payload = { date, staffName, customerName, items: billItems };
    try {
      if (editId) await updateData(`/wine-commission/${editId}`, payload);
      else await postData("/wine-commission", payload);
      setEditId(null); setBillItems([]); setCustomerName(""); setStaffName("");
      loadData();
      alert("Đã lưu Bill!");
    } catch (e) { alert("Lỗi lưu Bill!"); }
  };

  const handleDeleteBill = async (id: string) => {
    if (window.confirm("Xóa bill này vĩnh viễn?")) {
      await deleteData(`/wine-commission/${id}`);
      loadData();
    }
  };

  const handleDeleteMonth = async () => {
    if (!window.confirm(`NGUY HIỂM: Bạn có chắc muốn xóa TOÀN BỘ bill của tháng ${selectedMonth}?`)) return;
    try {
      await deleteData(`/wine-commission/month/${selectedMonth}`);
      loadData();
      alert("Đã xóa toàn bộ bill trong tháng!");
    } catch (error) {
      alert("Lỗi khi xóa tháng!");
    }
  };

  const handleEditBillClick = (bill: any) => {
    setEditId(bill._id);
    setDate(bill.date);
    setStaffName(bill.staffName);
    setCustomerName(bill.customerName || "");
    const mappedItems = bill.items.map((i: any) => ({
      wineId: i.wineId,
      wineName: i.wineName,
      price: i.price,
      quantity: i.quantity,
      unit: resolveUnit(i),
    }));
    setBillItems(mappedItems);
  };

  const resetForm = () => {
    setEditId(null);
    setDate(new Date().toISOString().split('T')[0]);
    setStaffName("");
    setCustomerName("");
    setBillItems([]);
    setWineSearch("");
    setCustomWineName("");
    setCustomWinePrice("");
    setCustomWineUnit("CHAI/BOTTLE");
    setShowAddCustom(false);
  };

  // === TÍNH TOÁN TỔNG HỢP CHI TIẾT ===
  const staffSummary = useMemo(() => {
    const map: Record<string, { 
      comm: number; 
      bottles: number; 
      glasses: number; 
      other: number;
      totalRevenue: number;
      itemDetails: Record<string, { name: string; unit: string; price: number; quantity: number; total: number }>;
    }> = {};

    bills.forEach(b => {
      if (!map[b.staffName]) {
        map[b.staffName] = { comm: 0, bottles: 0, glasses: 0, other: 0, totalRevenue: 0, itemDetails: {} };
      }
      
      map[b.staffName].comm += b.commissionEarned;
      map[b.staffName].totalRevenue += b.totalBillAmount;

      b.items.forEach((i: any) => {
        const u = resolveUnit(i);
        if (isGlassUnit(u)) map[b.staffName].glasses += i.quantity;
        else if (isBottleUnit(u)) map[b.staffName].bottles += i.quantity;
        else map[b.staffName].other += i.quantity;

        // Gom nhóm theo mã món để tính tổng số lượng bán ra của món đó
        const key = i.wineId;
        if (!map[b.staffName].itemDetails[key]) {
          map[b.staffName].itemDetails[key] = {
            name: i.wineName,
            unit: u,
            price: i.price,
            quantity: 0,
            total: 0
          };
        }
        map[b.staffName].itemDetails[key].quantity += i.quantity;
        map[b.staffName].itemDetails[key].total += (i.price * i.quantity);
      });
    });

    const list = Object.entries(map)
      .map(([name, data]) => ({ 
        name, 
        ...data,
        detailsArray: Object.values(data.itemDetails).sort((a, b) => b.total - a.total) 
      }))
      .filter(i => i.comm > 0)
      .sort((a, b) => b.comm - a.comm);

    const totalAllComm = list.reduce((acc, cur) => acc + cur.comm, 0);
    return { list, totalAllComm };
  }, [bills]);

  const sortedBills = useMemo(() => {
    return [...bills].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });
  }, [bills, sortOrder]);

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === "desc" ? "asc" : "desc");
  };

  const toggleExpand = (staffName: string) => {
    setExpandedStaff(prev => ({ ...prev, [staffName]: !prev[staffName] }));
  };

  const filteredWines = wineData.filter(w => w.name.toLowerCase().includes(wineSearch.toLowerCase()));

  const getUnitLabel = (unit?: string) => {
    if (isGlassUnit(unit)) return "Ly";
    if (isBottleUnit(unit)) return "Chai";
    return unit || "—";
  };

  return (
    <div className="h-full overflow-auto bg-slate-50 p-2 sm:p-6 text-sm font-sans">
      <div className="max-w-[1400px] mx-auto space-y-4 pb-10">
        
        {/* TOP HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-3 rounded-xl shadow-xs border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <GlassWater className="w-5 h-5"/>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 leading-tight">Hệ Thống Hoa Hồng Rượu</h1>
              <p className="text-xs text-slate-500 font-medium">Quản lý & Thống kê Commission FOH</p>
            </div>
          </div>
          
          <div className="flex items-center gap-5 mt-5 sm:mt-0">
            <div className="relative bg-slate-100 px-4 py-2 rounded-lg flex items-center gap-2 border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition w-48 overflow-hidden group">
              <Calendar className="w-4 h-4 text-slate-500 z-10 pointer-events-none group-hover:text-blue-600 transition-colors" />
              <span className="text-sm font-semibold text-blue-700 z-10 pointer-events-none">
                {selectedMonth
                  ? `Tháng ${selectedMonth.split("-")[1]} / ${selectedMonth.split("-")[0]}`
                  : "Chọn tháng"}
              </span>
              <input 
                type="month" 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
              />
            </div>

            <Button 
              variant="outline" 
              size="icon" 
              onClick={loadData} 
              className="h-9 w-9 text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <RefreshCcw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}/>
            </Button>

            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleDeleteMonth} 
              className="h-9 font-semibold shadow-sm"
            >
              <Trash2 className="w-4 h-4 mr-1.5"/> Xóa Tháng
            </Button>
          </div>
        </div>

        <Tabs defaultValue="manage" className="w-full">
          <TabsList className="mb-4 h-10 bg-white border border-slate-200 shadow-xs w-full sm:w-auto p-1 rounded-lg">
            <TabsTrigger value="manage" className="text-sm px-6 rounded-md data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all font-medium">
              Nhập Liệu & Lịch Sử
            </TabsTrigger>
            <TabsTrigger value="summary" className="text-sm px-6 rounded-md data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all font-medium">
              Tổng Hợp Commission
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manage" className="space-y-4 m-0">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* FORM NHẬP BILL */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                <Card className={`shadow-md border-0 ring-1 ${editId ? 'ring-amber-400 bg-amber-50/10' : 'ring-slate-200 bg-white'} transition-all`}>
                  <CardHeader className="py-3 px-4 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50/50 rounded-t-xl">
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                      {editId ? <><Edit3 className="w-4 h-4 text-amber-600"/> CẬP NHẬT BILL RƯỢU</> : <><PlusCircle className="w-4 h-4 text-blue-600"/> NHẬP BILL MỚI</>}
                    </CardTitle>
                    {editId && (
                      <Button variant="ghost" size="sm" onClick={resetForm} className="h-7 px-2 text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50">
                        <XCircle className="w-3 h-3 mr-1"/> Hủy sửa
                      </Button>
                    )}
                  </CardHeader>
                  
                  <CardContent className="p-4 space-y-5">
                    {/* Thông tin cơ bản */}
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><Calendar className="w-3 h-3"/> Ngày bán</label>
                          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9 text-sm font-medium border-slate-300 focus:border-blue-500 focus:ring-blue-500/20" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><User className="w-3 h-3"/> Nhân viên FOH</label>
                          <SelectUI value={staffName} onValueChange={setStaffName}>
                            <SelectTrigger className="h-9 text-sm font-medium border-slate-300 focus:ring-blue-500/20">
                              <SelectValue placeholder="Chọn FOH..."/>
                            </SelectTrigger>
                            <SelectContent>
                              {masterStaff.map(s => <SelectItem key={s._id} value={s.name} className="font-medium">{s.name}</SelectItem>)}
                            </SelectContent>
                          </SelectUI>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><FileText className="w-3 h-3"/> Tên Khách Hàng <span className="normal-case font-normal text-slate-400 text-[10px]">(Không bắt buộc)</span></label>
                        <Input placeholder="Nhập tên khách hàng..." value={customerName} onChange={e => setCustomerName(e.target.value)} className="h-9 text-sm border-slate-300 focus:border-blue-500 focus:ring-blue-500/20" />
                      </div>
                    </div>

                    {/* Tìm & Thêm Rượu */}
                    <div className="bg-blue-50/40 p-3.5 rounded-xl border border-blue-100 space-y-2.5 relative">
                      <label className="text-[11px] font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                        <Wine className="w-3.5 h-3.5"/> Chọn Rượu Của Khách
                      </label>
                      <div className="relative w-full shadow-sm rounded-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                        <Input 
                          placeholder="Gõ tên rượu (Bấm để thêm ngay vào bill)..." 
                          value={wineSearch} 
                          onFocus={() => setShowWineDropdown(true)} 
                          onBlur={() => setTimeout(() => setShowWineDropdown(false), 200)} 
                          onChange={e => setWineSearch(e.target.value)} 
                          className="h-10 pl-9 text-sm font-medium border-blue-200 bg-white focus:border-blue-500 focus:ring-blue-500/30 transition-all placeholder:text-slate-400" 
                        />
                        
                        {showWineDropdown && (
                          <div className="absolute z-50 w-full bg-white border border-slate-200 rounded-lg shadow-xl mt-1 max-h-64 overflow-y-auto overscroll-contain">
                            <div className="divide-y divide-slate-100">
                              {filteredWines.map(w => (
                                <div 
                                  key={w.id} 
                                  onMouseDown={(e) => { e.preventDefault(); handleSelectWine(w); }} 
                                  className="p-2.5 hover:bg-blue-50 cursor-pointer flex justify-between items-center gap-2 group transition-colors"
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-slate-700 group-hover:text-blue-700 text-xs truncate">{w.name}</div>
                                    <div className="text-[10px] text-slate-400 font-medium">{w.unit || "CHAI/BOTTLE"} {w.code && `• ${w.code}`}</div>
                                  </div>
                                  <Badge variant="secondary" className="bg-slate-100 text-blue-700 group-hover:bg-white border border-slate-200 group-hover:border-blue-200 shrink-0">
                                    {formatVND(w.price)}
                                  </Badge>
                                </div>
                              ))}
                              {filteredWines.length === 0 && (
                                <div className="p-4 text-sm text-slate-400 text-center flex flex-col items-center gap-1">
                                  <Search className="w-5 h-5 opacity-50"/>
                                  Không tìm thấy rượu phù hợp
                                </div>
                              )}
                            </div>
                            
                            <div className="p-2 bg-amber-50 border-t-2 border-amber-200 sticky bottom-0">
                              <button
                                onMouseDown={(e) => { e.preventDefault(); setShowAddCustom(true); if (wineSearch.trim()) setCustomWineName(wineSearch.trim()); setShowWineDropdown(false); }}
                                className="w-full text-left px-2.5 py-2 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-md flex items-center gap-1.5 transition-colors border border-amber-300"
                              >
                                <PlusCircle className="w-4 h-4"/> Thêm món mới không có trong danh sách
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Form thêm món mới thủ công */}
                      {showAddCustom && (
                        <div className="bg-white border-2 border-amber-300 rounded-xl p-3.5 space-y-3 shadow-md">
                          <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                            <span className="text-xs font-black text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                              <PlusCircle className="w-4 h-4"/> Tạo mã món mới
                            </span>
                            <button
                              onClick={() => { setShowAddCustom(false); setCustomWineName(""); setCustomWinePrice(""); setCustomWineUnit("CHAI/BOTTLE"); }}
                              className="text-slate-400 hover:text-red-600 p-0.5 rounded hover:bg-red-50 transition-colors"
                            >
                              <X className="w-4 h-4"/>
                            </button>
                          </div>
                          
                          <div className="space-y-2.5">
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Tên món *</label>
                              <Input
                                placeholder="VD: Rượu vang đỏ Pháp..."
                                value={customWineName}
                                onChange={e => setCustomWineName(e.target.value)}
                                className="h-9 text-sm font-medium border-slate-300 focus:border-amber-500 focus:ring-amber-500/20"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Giá (VNĐ) *</label>
                                <Input
                                  placeholder="VD: 1500000"
                                  value={customWinePrice}
                                  onChange={e => setCustomWinePrice(e.target.value)}
                                  inputMode="numeric"
                                  className="h-9 text-sm font-medium border-slate-300 focus:border-amber-500 focus:ring-amber-500/20"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Đơn vị *</label>
                                <SelectUI value={customWineUnit} onValueChange={(v) => setCustomWineUnit(v as any)}>
                                  <SelectTrigger className="h-9 text-sm font-medium border-slate-300 focus:ring-amber-500/20">
                                    <SelectValue/>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="CHAI/BOTTLE">Chai / Bottle</SelectItem>
                                    <SelectItem value="LY/GLASS">Ly / Glass</SelectItem>
                                    <SelectItem value="KHÁC">Khác</SelectItem>
                                  </SelectContent>
                                </SelectUI>
                              </div>
                            </div>
                            
                            {customWineName.trim() && customWinePrice && (
                              <div className="bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2 text-xs">
                                <div className="text-slate-500 text-[10px] uppercase font-bold mb-0.5">Xem trước:</div>
                                <div className="flex justify-between items-center gap-2">
                                  <span className="font-bold text-slate-800 truncate flex-1">{customWineName}</span>
                                  <span className="text-[10px] text-amber-700 font-bold shrink-0">
                                    {customWineUnit} • {formatVND(parseInt(customWinePrice.replace(/[^0-9]/g, ""), 10) || 0)}
                                  </span>
                                </div>
                              </div>
                            )}

                            <Button
                              onClick={handleAddCustomWine}
                              className="w-full h-10 bg-amber-600 hover:bg-amber-500 text-white text-xs font-black uppercase tracking-wider rounded-lg shadow-sm"
                            >
                              <Plus className="w-4 h-4 mr-1.5 stroke-[3]"/> Thêm vào Bill
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Giỏ Hàng */}
                      <div className="mt-3 bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden flex flex-col">
                        <div className="bg-slate-50 px-3 py-2 text-[10px] font-bold text-slate-500 flex justify-between border-b border-slate-100 uppercase tracking-widest">
                          <span>Sản phẩm</span>
                          <span className="w-24 text-center">Số lượng</span>
                        </div>
                        
                        <div className="p-1.5 flex-1 min-h-[120px] max-h-[220px] overflow-y-auto bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
                          {billItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-6 gap-2">
                              <GlassWater className="w-6 h-6 opacity-40"/>
                              <p className="text-xs font-medium">Chưa có rượu trong Bill</p>
                              <p className="text-[10px] text-slate-500">Hãy tìm và chọn rượu phía trên</p>
                            </div>
                          ) : (
                            <div className="space-y-1.5 p-1">
                              {billItems.map((item, idx) => {
                                const displayUnit = resolveUnit(item);
                                return (
                                  <div key={idx} className="flex justify-between items-center text-sm bg-white p-2.5 rounded-lg shadow-xs border border-slate-200 group hover:border-blue-300 transition-colors">
                                    <div className="flex-1 flex flex-col justify-center overflow-hidden pr-3">
                                      <span className="font-bold text-slate-700 truncate" title={item.wineName}>
                                        {item.wineName}
                                        {String(item.wineId).startsWith("CUSTOM_") && (
                                          <Badge className="ml-1 h-4 text-[8px] bg-amber-100 text-amber-700 border-amber-200">MỚI</Badge>
                                        )}
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-medium">
                                        x {formatVND(item.price)} • <span className="text-blue-600 font-bold">{getUnitLabel(displayUnit)}</span>
                                      </span>
                                    </div>
                                    
                                    <div className="flex items-center bg-slate-100 rounded-md p-1 border border-slate-200 shadow-inner group-hover:bg-white group-hover:border-blue-200 transition-colors">
                                      <button 
                                        onClick={() => handleChangeItemQty(idx, -1)} 
                                        className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 active:scale-95 transition-all text-slate-600"
                                      >
                                        <Minus className="w-3 h-3 stroke-[3]"/>
                                      </button>
                                      <span className="w-7 text-center font-bold text-slate-700">{item.quantity}</span>
                                      <button 
                                        onClick={() => handleChangeItemQty(idx, 1)} 
                                        className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm border border-slate-200 hover:bg-green-50 hover:text-green-600 hover:border-green-200 active:scale-95 transition-all text-slate-600"
                                      >
                                        <Plus className="w-3 h-3 stroke-[3]"/>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* TỔNG KẾT FORM */}
                    <div className="bg-linear-to-br from-slate-900 to-indigo-950 text-white p-4 rounded-xl shadow-lg border border-indigo-800">
                      <div className="flex justify-between text-xs opacity-80 mb-2 border-b border-indigo-800/50 pb-2">
                        <span className="font-medium tracking-wide uppercase">Tổng Tiền Rượu:</span>
                        <span className="font-bold">{formatVND(currentCalculations.totalBill)}</span>
                      </div>
                      <div className="flex justify-between items-end">
                        <div className="flex flex-col">
                          <span className="text-xs font-black uppercase tracking-widest text-indigo-200">HOA HỒNG NHẬN:</span>
                          {currentCalculations.hasVip && (
                            <span className="text-[10px] text-yellow-400 font-bold flex items-center gap-1 mt-1 bg-yellow-400/10 px-1.5 py-0.5 rounded-sm border border-yellow-400/20">
                              ⚡ Mốc VIP 10%
                            </span>
                          )}
                        </div>
                        <span className="text-3xl font-black text-amber-400 drop-shadow-md tracking-tight">
                          {formatVND(currentCalculations.commission)}
                        </span>
                      </div>
                    </div>

                    <Button onClick={handleSaveBill} className="w-full bg-green-600 hover:bg-green-500 h-11 font-black text-sm uppercase tracking-widest shadow-md hover:shadow-lg transition-all rounded-lg">
                      <Save className="w-4 h-4 mr-2 stroke-[3]"/> {editId ? "LƯU CẬP NHẬT BILL" : "LƯU VÀO HỆ THỐNG"}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* LỊCH SỬ CHI TIẾT */}
              <div className="lg:col-span-8 flex flex-col">
                <Card className="shadow-md border-0 ring-1 ring-slate-200 bg-white overflow-hidden rounded-xl">
                  <div className="bg-slate-50/80 px-4 py-3 text-xs font-black text-slate-500 uppercase tracking-widest flex justify-between border-b border-slate-100 items-center">
                    <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-500"/> LỊCH SỬ THÁNG {selectedMonth}</span>
                    <Badge variant="outline" className="bg-white border-slate-200 font-bold">{bills.length} BILL ĐÃ NHẬP</Badge>
                  </div>
                  
                  <div className="w-full overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50/90 backdrop-blur-md sticky top-0 z-10 shadow-xs">
                        <TableRow className="border-b-slate-200">
                          <TableHead 
                            className="w-[90px] p-3 text-[10px] font-bold uppercase text-slate-500 cursor-pointer hover:bg-slate-200 transition-colors"
                            onClick={toggleSortOrder}
                          >
                            <div className="flex items-center gap-1">
                              Ngày <ArrowUpDown className="w-3 h-3"/>
                            </div>
                          </TableHead>
                          <TableHead className="w-[120px] p-3 text-[10px] font-bold uppercase text-slate-500">FOH</TableHead>
                          <TableHead className="p-3 text-[10px] font-bold uppercase text-slate-500">Chi tiết rượu & Khách</TableHead>
                          <TableHead className="text-right p-3 text-[10px] font-bold uppercase text-slate-500">Tổng Bill</TableHead>
                          <TableHead className="text-right font-black text-blue-700 p-3 text-[10px] uppercase bg-blue-50/50">Hoa Hồng</TableHead>
                          <TableHead className="text-center w-[80px] p-3 text-[10px] font-bold uppercase text-slate-500">Sửa/Xóa</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedBills.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-20 text-slate-400 bg-slate-50/30">
                              <div className="flex flex-col items-center gap-3">
                                <FileText className="w-8 h-8 opacity-20"/>
                                <span className="font-semibold text-sm">Tháng này chưa có dữ liệu.</span>
                                <span className="text-xs opacity-70">Hãy nhập bill mới ở form bên trái.</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : 
                          sortedBills.map(b => (
                            <TableRow key={b._id} className={`hover:bg-slate-50 group border-b-slate-100 transition-colors ${editId === b._id ? 'bg-amber-50/50 hover:bg-amber-50' : ''}`}>
                              <TableCell className="p-3 text-[11px] font-medium text-slate-600">{b.date.split('-')[2]}/{b.date.split('-')[1]}</TableCell>
                              <TableCell className="p-3 font-bold text-blue-700 text-xs">
                                <div className="flex items-center gap-1.5"><User className="w-3 h-3 text-blue-300"/> {b.staffName}</div>
                              </TableCell>
                              <TableCell className="p-3 text-[11px] text-slate-600 leading-relaxed max-w-[250px]">
                                <div className="space-y-1">
                                  {b.items.map((it: any, idx: number) => {
                                    const displayUnit = resolveUnit(it);
                                    return (
                                      <div key={idx} className="flex items-start gap-1">
                                        <span className="font-bold text-slate-700 bg-slate-100 px-1 rounded text-[9px]">{it.quantity}</span>
                                        <span className="truncate">{it.wineName}</span>
                                        <span className="text-[9px] text-blue-500 font-bold shrink-0">{getUnitLabel(displayUnit)}</span>
                                      </div>
                                    );
                                  })}
                                  {b.customerName && (
                                    <div className="text-blue-500 font-medium text-[10px] mt-1 flex items-center gap-1 bg-blue-50 w-fit px-1.5 rounded-sm">
                                      KH: {b.customerName}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="p-3 text-right font-semibold text-slate-700 text-xs">{formatVND(b.totalBillAmount)}</TableCell>
                              <TableCell className="p-3 text-right font-black text-emerald-600 text-[13px] bg-blue-50/10">
                                {formatVND(b.commissionEarned)}
                                {b.isVipRuleApplied && <Badge className="ml-1.5 h-4 text-[8px] bg-red-500/90 text-white border-0 shadow-xs rounded-sm hover:bg-red-500">VIP</Badge>}
                              </TableCell>
                              <TableCell className="p-3 text-center">
                                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all justify-center">
                                  <Button variant="ghost" size="icon" onClick={() => handleEditBillClick(b)} className="w-7 h-7 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 shadow-xs border border-blue-100"><Edit3 className="w-3.5 h-3.5"/></Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDeleteBill(b._id)} className="w-7 h-7 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 shadow-xs border border-red-100"><Trash2 className="w-3.5 h-3.5"/></Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        }
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ========================================= */}
          {/* TAB TỔNG HỢP COMMISSION (ĐÃ NÂNG CẤP)      */}
          {/* ========================================= */}
          <TabsContent value="summary" className="m-0 pt-2">
            <Card className="shadow-xl border-0 ring-1 ring-slate-200 max-w-[1000px] mx-auto overflow-hidden rounded-2xl bg-white">
              <div className="p-5 bg-linear-to-r from-blue-900 to-indigo-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                    <CheckCircle2 className="w-6 h-6 text-blue-200" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg tracking-wider uppercase text-white drop-shadow-md">TỔNG HỢP HOA HỒNG</h3>
                    <p className="text-[11px] text-blue-200 font-medium uppercase tracking-widest mt-0.5 opacity-80">
                      Báo Cáo Tháng {selectedMonth}
                    </p>
                  </div>
                </div>
                
                <div className="md:text-right bg-black/20 p-3 rounded-xl border border-white/10 backdrop-blur-md">
                  <span className="text-[10px] block opacity-70 uppercase font-black tracking-widest text-indigo-200">TỔNG CHI THƯỞNG THÁNG NÀY:</span>
                  <span className="text-3xl font-black text-amber-400 drop-shadow-lg tracking-tighter">
                    {formatVND(staffSummary.totalAllComm)}
                  </span>
                </div>
              </div>
              
              <Table>
                <TableHeader className="bg-slate-50 border-b border-slate-200">
                  <TableRow>
                    <TableHead className="font-black text-slate-500 uppercase tracking-widest text-xs py-4 pl-6 w-[250px]">Thành Viên FOH</TableHead>
                    <TableHead className="text-center font-black text-slate-500 uppercase tracking-widest text-xs py-4 w-[90px]">Chai</TableHead>
                    <TableHead className="text-center font-black text-slate-500 uppercase tracking-widest text-xs py-4 w-[90px]">Ly (Glass)</TableHead>
                    <TableHead className="text-center font-black text-slate-500 uppercase tracking-widest text-xs py-4 w-[90px]">Khác</TableHead>
                    <TableHead className="text-right font-black text-slate-500 uppercase tracking-widest text-xs py-4">Doanh Thu</TableHead>
                    <TableHead className="text-right font-black text-blue-700 uppercase tracking-widest text-xs py-4 pr-6">Hoa Hồng</TableHead>
                    <TableHead className="text-center font-black text-slate-500 uppercase tracking-widest text-xs py-4 w-[100px]">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffSummary.list.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-24 text-slate-400 bg-slate-50/50">
                        <Wine className="w-10 h-10 mx-auto mb-3 opacity-20"/>
                        <span className="font-bold">Không có nhân sự nào nhận hoa hồng tháng này.</span>
                      </TableCell>
                    </TableRow>
                  ) : (
                    staffSummary.list.map((item, idx) => {
                      const isExpanded = expandedStaff[item.name];
                      return (
                        <React.Fragment key={idx}>
                          <TableRow className={`hover:bg-blue-50/50 border-b border-slate-100 transition-colors ${isExpanded ? 'bg-blue-50/30' : ''}`}>
                            <TableCell className="font-bold text-slate-800 text-sm pl-6 py-4 flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-black border border-blue-200 shrink-0">
                                {item.name.charAt(0)}
                              </div>
                              {item.name}
                            </TableCell>
                            <TableCell className="text-center py-4">
                              {item.bottles > 0 ? (
                                <Badge variant="secondary" className="font-bold text-xs bg-blue-50 text-blue-700 border-blue-200 px-3 py-1 shadow-xs">
                                  {item.bottles} chai
                                </Badge>
                              ) : <span className="text-slate-300 text-xs">—</span>}
                            </TableCell>
                            <TableCell className="text-center py-4">
                              {item.glasses > 0 ? (
                                <Badge variant="secondary" className="font-bold text-xs bg-amber-50 text-amber-700 border-amber-200 px-3 py-1 shadow-xs">
                                  {item.glasses} ly
                                </Badge>
                              ) : <span className="text-slate-300 text-xs">—</span>}
                            </TableCell>
                            <TableCell className="text-center py-4">
                              {item.other > 0 ? (
                                <Badge variant="secondary" className="font-bold text-xs bg-slate-100 text-slate-600 border-slate-200 px-3 py-1 shadow-xs">
                                  {item.other}
                                </Badge>
                              ) : <span className="text-slate-300 text-xs">—</span>}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-slate-600 text-xs">
                              {formatVND(item.totalRevenue)}
                            </TableCell>
                            <TableCell className="text-right font-black text-emerald-600 text-lg pr-6 py-4">
                              {formatVND(item.comm)}
                            </TableCell>
                            <TableCell className="text-center py-4">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => toggleExpand(item.name)}
                                className={`h-8 px-2 text-[11px] font-bold border transition-colors ${isExpanded ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                              >
                                {isExpanded ? <><ChevronUp className="w-3.5 h-3.5 mr-1"/> Ẩn</> : <><ChevronDown className="w-3.5 h-3.5 mr-1"/> Chi tiết</>}
                              </Button>
                            </TableCell>
                          </TableRow>

                          {/* Dòng hiển thị chi tiết khi expand */}
                          {isExpanded && (
                            <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b-2 border-slate-200">
                              <TableCell colSpan={7} className="p-0">
                                <div className="p-4 pl-16 pr-6">
                                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                                    <div className="bg-slate-100/80 px-4 py-2 border-b border-slate-200 flex items-center gap-2">
                                      <ReceiptText className="w-4 h-4 text-slate-500" />
                                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Danh sách RƯỢU đã bán (được tính hoa hồng)</span>
                                    </div>
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="border-b-slate-200 bg-slate-50/50">
                                          <TableHead className="text-[10px] font-bold text-slate-500 uppercase py-2 h-8">Tên món</TableHead>
                                          <TableHead className="text-[10px] font-bold text-slate-500 uppercase py-2 h-8 text-center w-[80px]">Đơn vị</TableHead>
                                          <TableHead className="text-[10px] font-bold text-slate-500 uppercase py-2 h-8 text-center w-[80px]">SL bán</TableHead>
                                          <TableHead className="text-[10px] font-bold text-slate-500 uppercase py-2 h-8 text-right w-[120px]">Đơn giá</TableHead>
                                          <TableHead className="text-[10px] font-bold text-slate-500 uppercase py-2 h-8 text-right w-[120px] pr-4">Thành tiền</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {item.detailsArray.map((detail, dIdx) => (
                                          <TableRow key={dIdx} className="border-b-slate-100 last:border-0 hover:bg-slate-50">
                                            <TableCell className="py-2 text-xs font-semibold text-slate-700">{detail.name}</TableCell>
                                            <TableCell className="py-2 text-center">
                                              <Badge variant="outline" className={`text-[9px] font-bold h-5 ${isGlassUnit(detail.unit) ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                                {getUnitLabel(detail.unit)}
                                              </Badge>
                                            </TableCell>
                                            <TableCell className="py-2 text-center text-xs font-bold text-slate-800">{detail.quantity}</TableCell>
                                            <TableCell className="py-2 text-right text-xs text-slate-500">{formatVND(detail.price)}</TableCell>
                                            <TableCell className="py-2 text-right text-xs font-bold text-emerald-600 pr-4">{formatVND(detail.total)}</TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              <div className="bg-slate-50 p-4 border-t border-slate-200 text-center font-medium text-slate-400 text-xs">
                Hệ thống chỉ hiển thị những nhân viên FOH có phát sinh hoa hồng. Bấm "Chi tiết" để xem danh sách món từng người đã bán.
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}