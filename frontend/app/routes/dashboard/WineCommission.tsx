import React, { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select as SelectUI, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Save, PlusCircle, GlassWater } from "lucide-react";
import { fetchData, postData, updateData, deleteData } from "@/lib/fetch-util";

// ==========================================
// DATA RƯỢU TĨNH (FULL DANH SÁCH TỪ EXCEL)
// ==========================================
const wineData = [
  { id: "W1", name: "SKYY VODKA", price: 2800000 },
  { id: "W2", name: "HAKU", price: 2800000 },
  { id: "W3", name: "ABSOLUTE ELYX 1L", price: 4200000 },
  { id: "W4", name: "GREY GOOSE", price: 2800000 },
  { id: "W5", name: "KETEL ONE", price: 2800000 },
  { id: "W6", name: "TANQUERAY", price: 2800000 },
  { id: "W7", name: "ROKU", price: 2800000 },
  { id: "W8", name: "LONDON NO.3", price: 3000000 },
  { id: "W9", name: "HENDRICK'S", price: 2800000 },
  { id: "W10", name: "KINOBI KYOTO", price: 4200000 },
  { id: "W11", name: "KINGSTON 62 WHITE", price: 2800000 },
  { id: "W12", name: "KRAKEN", price: 2800000 },
  { id: "W13", name: "JOSE CUERVO TRADICTIONAL", price: 2800000 },
  { id: "W14", name: "1800 CRISTALINO", price: 3900000 },
  { id: "W15", name: "CLASE AZUL REPOSADO", price: 14700000 },
  { id: "W16", name: "PATRON X.O", price: 3600000 },
  { id: "W17", name: "DON JULIO 1942", price: 12900000 },
  { id: "W18", name: "DON JULIO BLANCO", price: 3000000 },
  { id: "W19", name: "BULLEIT", price: 2800000 },
  { id: "W20", name: "WILD TURKEY 8 YEAR", price: 2800000 },
  { id: "W21", name: "JACK DANIEL", price: 2800000 },
  { id: "W22", name: "MAKER'S MARK", price: 2800000 },
  { id: "W23", name: "MACALLAN 12 SHERRY CASK", price: 6300000 },
  { id: "W24", name: "MACALLAN 15 DOUBLE CASK", price: 9900000 },
  { id: "W25", name: "MACALLAN 18 DOUBLE CASK", price: 25000000 },
  { id: "W26", name: "THE GLENLIVET 12", price: 3100000 },
  { id: "W27", name: "THE GLENLIVET 15", price: 4700000 },
  { id: "W28", name: "THE GLENLIVET 18", price: 8600000 },
  { id: "W29", name: "THE GLENLIVET 21", price: 18800000 },
  { id: "W30", name: "THE GLENLIVET 25", price: 30800000 },
  { id: "W31", name: "GLENFIDDICH 15", price: 3900000 },
  { id: "W32", name: "GLENFIDDICH 18", price: 6200000 },
  { id: "W33", name: "BALVENIE 14", price: 6900000 },
  { id: "W34", name: "BALVENIE 21", price: 22000000 },
  { id: "W35", name: "SINGLETON 12", price: 3100000 },
  { id: "W36", name: "SINGLETON 15", price: 5000000 },
  { id: "W37", name: "LAPHROAIG 10", price: 3700000 },
  { id: "W38", name: "BOWMORE 12", price: 3000000 },
  { id: "W39", name: "BOWMORE 15", price: 5200000 },
  { id: "W40", name: "BOWMORE 18", price: 7900000 },
  { id: "W41", name: "CHIVAS MINUZARA", price: 3000000 },
  { id: "W42", name: "CHIVAS MINUZARA 18", price: 5300000 },
  { id: "W43", name: "CHIVAS REGAL 18 BLUE SIGNATURE", price: 4300000 },
  { id: "W44", name: "CHIVAS ROYAL SALUTE 21", price: 7300000 },
  { id: "W45", name: "CHIVAS REGAL 25", price: 13500000 },
  { id: "W46", name: "BALLANTINE 17", price: 3600000 },
  { id: "W47", name: "BALLANTINE 21", price: 5500000 },
  { id: "W48", name: "BALLANTINE 30", price: 16700000 },
  { id: "W49", name: "JOHNNIE WALKER BLUE LABEL", price: 11200000 },
  { id: "W50", name: "JOHNNIE WALKER DOUBLE BLACK", price: 2800000 },
  { id: "W51", name: "NAKED MALT", price: 2800000 },
  { id: "W52", name: "MATSUI MIZUNARA CASK", price: 7500000 },
  { id: "W53", name: "MATSUI KURAYOSHI 8YO", price: 7600000 },
  { id: "W54", name: "KAKUBIN SUNTORY", price: 2800000 },
  { id: "W55", name: "HIBIKI HARMONY", price: 9500000 },
  { id: "W56", name: "THE YAMAZAKI DISTILLERS RESERVE", price: 9200000 },
  { id: "W57", name: "THE HAKUSHU DISTILLERS RESERVE", price: 9500000 },
  { id: "W58", name: "HENNESSY VSOP", price: 3500000 },
  { id: "W59", name: "HENNESSY X.O", price: 9800000 },
  { id: "W60", name: "MARTELL CORDON BLEU", price: 9400000 },
  { id: "W61", name: "The Yamazaki 12", price: 11000000 },
  { id: "W62", name: "Chateau Palmer 2008, Margaux 3rd Grand Cru Classe, Merlot/ Cabernet Sauvignon", price: 29000000 },
  { id: "W63", name: "Chateau Clinet, Pomerol, Bordeaux Blend", price: 7700000 },
  { id: "W64", name: "Pauillac De Chateau Latour, Bordeaux Blend", price: 7900000 },
  { id: "W65", name: "Chateau Larcis Ducasse, St. Emilion 1st Grand Cru Classe, Bordeaux Blend", price: 7700000 },
  { id: "W66", name: "Chateau Malescot St Exupery, Margaux 3rd Grand Cru Classe, Bordeaux Blend", price: 6200000 },
  { id: "W67", name: "Chateau Rouget, Pomerol, Bordeaux Blend", price: 5700000 },
  { id: "W68", name: "Chateau Hyon la Fleur,Merlot / Cabernet Sauvignon", price: 4800000 },
  { id: "W69", name: "Chateau Prieure Lichine, Margaux 4th Grand Cru Classe, Bordeaux Blend", price: 5600000 },
  { id: "W70", name: "Chateau Mont Redon, Chateauneuf du Pape, Grenache / Syrah/ Mourvedre", price: 3800000 },
  { id: "W71", name: "Chateau Saint Andre, Montagne Saint Emilion, Merlot/ Cab Sauvignon", price: 2700000 },
  { id: "W72", name: "Louis Jadot, Cote de Beaune Villages, Pinot Noir", price: 2600000 },
  { id: "W73", name: "Ronan By Chateau Clinet,Merlot", price: 1400000 },
  { id: "W74", name: "Maison Castel, Merlot, Bordeaux", price: 1400000 },
  { id: "W75", name: "Opus One 2019, Cabernet Sauvignon", price: 25000000 },
  { id: "W76", name: "Cum Laude - Banfi Toscana, Italy", price: 2400000 },
  { id: "W77", name: "Castello Banfi, Brunello di Montalcino DOCG, Sangiovese,Italy", price: 4800000 },
  { id: "W78", name: "Masi Costasera, Amarone della Valpolicella Classico DOCG,Corvina/ Rondinella /Molinara,Italy", price: 4800000 },
  { id: "W79", name: "Alvaro Palacios, La Vendimia, Garnacha/ Tempranillo", price: 1400000 },
  { id: "W80", name: "Concha Y Toro, Gran Reserva, Carmenere", price: 1400000 },
  { id: "W81", name: "La Joya Gran Reserva Syrah", price: 1700000 },
  { id: "W82", name: "Trimbach, Gewurztraminer, Alsace", price: 2400000 },
  { id: "W83", name: "Guigal, Cotes du Rhone, Rhone Blend", price: 1700000 },
  { id: "W84", name: "Domaine Huet, Clos du Bourg \"Demi Sec\", Chenin Blanc", price: 4800000 },
  { id: "W85", name: "Henri Bourgeois, 'En Travertin', Pouilly Fume, Sauvignon Blanc", price: 1700000 },
  { id: "W86", name: "Olivier Leflaive, Meursault, Chardonany", price: 6700000 },
  { id: "W87", name: "Louis Jadot, Pouilly Fuisse, Chardonnay", price: 3000000 },
  { id: "W88", name: "Clay Creek Chardonnay", price: 1700000 },
  { id: "W89", name: "D' Arenberg, The Olive Grove, Chardonnay", price: 1700000 },
  { id: "W90", name: "Torres, Vina Esmeralda Semi Dry White, Gewurztraminer Moscato", price: 1400000 },
  { id: "W91", name: "Concha Y Toro, Marques De Casa Concha Chardonnay", price: 1700000 },
  { id: "W92", name: "Vidal Estate by Villa Maria, Sauvignon Blanc, Malborough Valley", price: 1400000 },
  { id: "W93", name: "Villa Maria, Private Bin Sauvignon, Marlborough, Sauvignon Blanc", price: 1400000 },
  { id: "W94", name: "Rimapere by Baron Edmond de Rothschild", price: 1900000 },
  { id: "W95", name: "Gunderloch, \"Fritz\" ,Riesling", price: 1400000 },
  { id: "W96", name: "Villa Garrel Rose, Cotes de Provence, Cinsault Grenache", price: 1400000 },
  { id: "W97", name: "Maison Castel Rose, IGP d'Oc", price: 1400000 },
  { id: "W98", name: "Miguel Torres, Santa Digna , Cabernet Sauvignon, Chile", price: 1400000 },
  { id: "W99", name: "Bottega, Millesimato Brut, Spumante Bianco,Veneto, Italy", price: 1400000 },
  { id: "W100", name: "CHAMPAGNE Delamotte, Brut,France", price: 3900000 },
  { id: "W101", name: "CHAMPAGNE J.M. Labruyere, Prologue, Grand Cru,France", price: 12200000 },
  { id: "W102", name: "CHAMPAGNE Taittinger, Brut Prestige Rose, France", price: 5100000 },
  { id: "W103", name: "CHAMPAGNE Taittinger, Prelude Grands Crus Brut, France", price: 6000000 },
  { id: "W104", name: "CHAMPAGNE G.H Mumm Grand Cordon", price: 3900000 },
  { id: "W105", name: "Comtes De CHAMPAGNE Grands Crus - Blanc de blanc", price: 19500000 },
  { id: "W106", name: "CHAMPAGNE Salon, Le Mesnil Blanc de Blancs, France", price: 52400000 },
  { id: "W107", name: "CHAMPAGNE Tribaut Schloesser 750ml, 12-15%", price: 3900000 },
  { id: "W108", name: "CHAMPAGNE Dom Perignon, Vintage Brut", price: 12000000 },
  { id: "W109", name: "SAKE Ozeki Hozonjo Karatamba 15% 300ml", price: 1100000 },
  { id: "W110", name: "SAKE Ozeki Hozonjo Karatamba 15% 720ml", price: 1400000 },
  { id: "W111", name: "SAKE Ozeki Hozonjo Karatamba 15% 1800ml", price: 2400000 },
  { id: "W112", name: "SAKE Ozeki Yamada Nishiki 14% 300ml", price: 1200000 },
  { id: "W113", name: "SAKE Ozeki Yamada Nishiki 14% 720ml", price: 1400000 },
  { id: "W114", name: "SAKE Ozeki Yamada Nishiki 14% 1800ml", price: 3000000 },
  { id: "W115", name: "SAKE Dassai 45 16% -300ml", price: 1200000 },
  { id: "W116", name: "SAKE Dassai 45 16% -720ml", price: 2400000 },
  { id: "W117", name: "SAKE Dassai 39 16% -300ml", price: 1700000 },
  { id: "W118", name: "SAKE Dassai 39 16% -720ml", price: 3000000 },
  { id: "W119", name: "SAKE Dassai 23 16% -720ml", price: 4700000 },
  { id: "W120", name: "SAKE Asashibori Shuppintyozousyu Honjozo 20% 900ml", price: 1700000 },
  { id: "W121", name: "SAKE Shochikubai Fushimizujitate Kyoto Junmai 13-14% 700ML", price: 1200000 },
  { id: "W122", name: "SAKE Shochikubai Fushimizujitate Kyoto Junmai 13-14% 1800ML", price: 2100000 },
  { id: "W123", name: "SAKE Gekkeikan Daiginjo 15% 300ml", price: 1100000 },
  { id: "W124", name: "SAKE Gekkeikan Daiginjo 15% 720ml", price: 1400000 },
  { id: "W125", name: "SAKE Gekkeikan Nigori 10,5% 300ml", price: 1100000 },
  { id: "W126", name: "SAKE Horin Junmai Daiginjo 16% 300ml", price: 1200000 },
  { id: "W127", name: "SAKE Horin Junmai Daiginjo 16% 720ml", price: 3500000 },
  { id: "W128", name: "SAKE Horin Junmai Daiginjo 16% 1,800ml", price: 4700000 },
  { id: "W129", name: "SAKE Gekkeikan Tokubetsu with Gold Foil 15% 1800ml", price: 3500000 },
  { id: "W130", name: "SAKE Gekkeikan Daiginjo Fukuro Shibori 16% - 17% 720ml (Limited)", price: 7900000 },
  { id: "W131", name: "SAKE Ozeki Barrel 15% 1800ml", price: 3700000 },
  { id: "W132", name: "SAKE Chotokusen Osakaya Chobei Daiginjo 15% 300ml", price: 1100000 },
  { id: "W133", name: "SAKE Chotokusen Osakaya Chobei Daiginjo 15% 720ml", price: 1900000 },
  { id: "W134", name: "SAKE Chotokusen Osakaya Chobei Daiginjo 15% 1800ml", price: 3000000 },
  { id: "W135", name: "SAKE Daiginjo Choju 16% 720ml", price: 7300000 },
  { id: "W136", name: "SAKE Snow aged Junmai Daiginjo 3 years Hakkaisan (Yukimuro)17% (720ml)", price: 3500000 },
  { id: "W137", name: "SAKE Shichiken Sparkling 11% (720ml)", price: 2400000 },
  { id: "W138", name: "SAKE Kagatobi Junmai Nigori Sparkling 720ml", price: 1700000 },
  { id: "W139", name: "SHOCHU KHOAI LANG KAIDO IWA NO AKA / 720 ML", price: 1400000 },
  { id: "W140", name: "Umeshu Kodawari Mi-Iri Nakata / 720ML / 12%", price: 1700000 },
  { id: "W141", name: "F,San Marzano,Puglia,Negroamaro 750ml", price: 2800000 },
  { id: "W142", name: "RƯỢU SAKE Kubota Senju Ginjo 15% 1800ml", price: 3300000 },
  { id: "W143", name: "SKYY VODKA GLS", price: 220000 },
  { id: "W144", name: "HAKU GLASS", price: 220000 },
  { id: "W145", name: "GREY GOOSE GLASS", price: 220000 },
  { id: "W146", name: "KETEL ONE GLASS", price: 220000 },
  { id: "W147", name: "TANQUERAY GLASS", price: 220000 },
  { id: "W148", name: "ROKU GLASS", price: 220000 },
  { id: "W149", name: "LONDON NO.3 GLASS", price: 250000 },
  { id: "W150", name: "HENDRICK'S GLASS", price: 230000 },
  { id: "W151", name: "KINOBI KYOTO GLASS", price: 360000 },
  { id: "W152", name: "KINGSTON 62 WHITE GLASS", price: 220000 },
  { id: "W153", name: "KRAKEN GLASS", price: 220000 },
  { id: "W154", name: "JOSE CUERVO TRADICTIONAL GLASS", price: 220000 },
  { id: "W155", name: "1800 CRISTALINO GLASS", price: 320000 },
  { id: "W156", name: "PATRON X.O GLASS", price: 290000 },
  { id: "W157", name: "DON JULIO BLANCO GLASS", price: 240000 },
  { id: "W158", name: "BULLEIT GLASS", price: 220000 },
  { id: "W159", name: "WILD TURKEY 8 YEAR GLASS", price: 220000 },
  { id: "W160", name: "JACK DANIEL GLASS", price: 220000 },
  { id: "W161", name: "MAKER'S MARK GLASS", price: 220000 },
  { id: "W162", name: "MACALLAN 12 SHERRY CASK GLASS", price: 540000 },
  { id: "W163", name: "MACALLAN 15 DOUBLE CASK GLASS", price: 960000 },
  { id: "W164", name: "Concha Y Toro, Gran Reserva, Carmenere GLASS", price: 290000 },
  { id: "W165", name: "THE GLENLIVET 12 GLASS", price: 270000 },
  { id: "W166", name: "THE GLENLIVET 15 GLASS", price: 400000 },
  { id: "W167", name: "GLENFIDDICH 15 GLASS", price: 340000 },
  { id: "W168", name: "BALVENIE 14 GLASS", price: 590000 },
  { id: "W169", name: "SINGLETON 12 GLASS", price: 270000 },
  { id: "W170", name: "LAPHROAIG 10 GLASS", price: 290000 },
  { id: "W171", name: "BOWMORE 12 GLASS", price: 260000 },
  { id: "W172", name: "BOWMORE 15 GLASS", price: 450000 },
  { id: "W173", name: "CHIVAS MINUZARA GLASS", price: 260000 },
  { id: "W174", name: "CHIVAS REGAL 18 BLUE SIGNATURE GLASS", price: 370000 },
  { id: "W175", name: "BALLANTINE 17 GLASS", price: 310000 },
  { id: "W176", name: "JOHNNIE WALKER DOUBLE BLACK GLASS", price: 220000 },
  { id: "W177", name: "NAKED MALT GLASS", price: 220000 },
  { id: "W178", name: "KAKUBIN SUNTORY GLASS", price: 220000 },
  { id: "W179", name: "Vidal Estate by Villa Maria, Sauvignon Blanc, Malborough Valley GLASS", price: 290000 },
  { id: "W182", name: "HENNESSY VSOP GLASS", price: 330000 },
  { id: "W184", name: "Rượu Glenlivet 18 GLASS", price: 750000 },
  { id: "W185", name: "Sake Dassai 23 - 1800ml", price: 8000000 },
  { id: "W186", name: "RƯỢU VODKA MARTINI GLASS", price: 250000 },
  { id: "W187", name: "RƯỢU BAILEYS GLASS", price: 220000 },
  { id: "W188A", name: "RƯỢU SAKE Kubota Senju Ginjo 15% 720ml", price: 2100000 },
  { id: "W188B", name: "Sake Kubota Junmai Daiginjo 300ml", price: 1100000 },
  { id: "W188C", name: "MACALLAN 18 DOUBLE CASK GLASS", price: 2200000 }
];

export default function WineCommissionPage() {
  // --- STATES DATA TỪ BACKEND ---
  const [masterStaff, setMasterStaff] = useState<any[]>([]); // Chỉ lấy FOH
  const [bills, setBills] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // --- STATES FORM NHẬP BILL ---
  const [editId, setEditId] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [staffName, setStaffName] = useState("");
  const [customerName, setCustomerName] = useState("");
  
  // Danh sách rượu được chọn trong Bill hiện tại
  const [billItems, setBillItems] = useState<{wineId: string, wineName: string, price: number, quantity: number}[]>([]);

  // --- STATES NHẬP ITEM (AUTOCOMPLETE) ---
  const [wineSearch, setWineSearch] = useState("");
  const [showWineDropdown, setShowWineDropdown] = useState(false);
  const [selectedWineId, setSelectedWineId] = useState("");
  const [selectedQuantity, setSelectedQuantity] = useState<number | "">("");

  // ==========================================
  // FETCH INIT DATA
  // ==========================================
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [staffRes, billsRes]: [any, any] = await Promise.all([
        fetchData("/staff"),
        fetchData("/wine-commission")
      ]);
      
      const allStaff = staffRes.data || staffRes || [];
      // Chỉ lọc lấy FOH
      setMasterStaff(allStaff.filter((s: any) => s.department === "FOH"));
      
      setBills(billsRes.data || billsRes || []);
      
      // Default Date là hôm nay
      setDate(new Date().toISOString().split('T')[0]);
    } catch (error) {
      console.error("Lỗi tải dữ liệu", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // ==========================================
  // LOGIC TÍNH TOÁN REALTIME CHO BILL ĐANG NHẬP
  // ==========================================
  const currentCalculations = useMemo(() => {
    let total = 0;
    let hasVip = false;

    billItems.forEach(item => {
      total += item.price * item.quantity;
      if (item.price >= 10000000) hasVip = true;
    });

    let comm = 0;
    if (hasVip) {
      comm = total * 0.1; // 10%
    } else {
      if (total >= 10000000) comm = 500000;
      else if (total >= 5000000) comm = 300000;
      else if (total >= 3000000) comm = 100000;
    }

    return { totalBill: total, commission: comm, hasVip };
  }, [billItems]);

  const formatVND = (num: number) => Math.round(num).toLocaleString("vi-VN") + "đ";

  // ==========================================
  // HANDLERS BÊN TRONG BILL
  // ==========================================
  const handleAddItemToBill = () => {
    if (!selectedWineId || !selectedQuantity || selectedQuantity <= 0) return;
    
    const wine = wineData.find(w => w.id === selectedWineId);
    if (!wine) return;

    const existingItemIndex = billItems.findIndex(i => i.wineId === selectedWineId);
    
    if (existingItemIndex >= 0) {
      const newItems = [...billItems];
      newItems[existingItemIndex].quantity += Number(selectedQuantity);
      setBillItems(newItems);
    } else {
      setBillItems([...billItems, {
        wineId: wine.id,
        wineName: wine.name,
        price: wine.price,
        quantity: Number(selectedQuantity)
      }]);
    }

    // Reset sau khi thêm
    setWineSearch("");
    setSelectedWineId("");
    setSelectedQuantity("");
  };

  const handleRemoveItemFromBill = (index: number) => {
    const newItems = [...billItems];
    newItems.splice(index, 1);
    setBillItems(newItems);
  };

  const resetForm = () => {
    setEditId(null);
    setDate(new Date().toISOString().split('T')[0]);
    setStaffName("");
    setCustomerName("");
    setBillItems([]);
    setWineSearch("");
    setSelectedWineId("");
  };

  // ==========================================
  // CRUD ACTIONS VỚI BACKEND
  // ==========================================
  const handleSaveBill = async () => {
    if (!date || !staffName || billItems.length === 0) {
      return alert("Vui lòng nhập Ngày, Tên FOH và ít nhất 1 loại rượu!");
    }

    const payload = {
      date, staffName, customerName, items: billItems
    };

    try {
      if (editId) {
        await updateData(`/wine-commission/${editId}`, payload);
        alert("✅ Cập nhật Bill thành công!");
      } else {
        await postData("/wine-commission", payload);
        alert("🎉 Đã thêm Bill Hoa Hồng mới!");
      }
      resetForm();
      loadData(); 
    } catch (error) {
      alert("Có lỗi khi lưu Bill!");
    }
  };

  const handleDeleteBill = async (id: string) => {
    if (!window.confirm("Xóa Bill này vĩnh viễn?")) return;
    try {
      await deleteData(`/wine-commission/${id}`);
      loadData();
    } catch (error) {
      alert("Xóa thất bại!");
    }
  };

  const handleEditBillClick = (bill: any) => {
    setEditId(bill._id);
    setDate(bill.date);
    setStaffName(bill.staffName);
    setCustomerName(bill.customerName || "");
    const mappedItems = bill.items.map((i: any) => ({
      wineId: i.wineId, wineName: i.wineName, price: i.price, quantity: i.quantity
    }));
    setBillItems(mappedItems);
  };

  // ==========================================
  // LOGIC TAB THỐNG KÊ TỔNG HỢP NHÂN VIÊN
  // ==========================================
  const staffSummary = useMemo(() => {
    const summaryMap: Record<string, { totalComm: number, totalBottles: number }> = {};
    
    masterStaff.forEach(s => {
      summaryMap[s.name] = { totalComm: 0, totalBottles: 0 };
    });

    bills.forEach(bill => {
      if (!summaryMap[bill.staffName]) {
        summaryMap[bill.staffName] = { totalComm: 0, totalBottles: 0 };
      }
      summaryMap[bill.staffName].totalComm += bill.commissionEarned;
      
      const bottlesInBill = bill.items.reduce((acc: number, item: any) => acc + item.quantity, 0);
      summaryMap[bill.staffName].totalBottles += bottlesInBill;
    });

    return Object.entries(summaryMap).map(([name, data]) => ({ name, ...data }));
  }, [bills, masterStaff]);

  return (
    <div className="h-full overflow-auto bg-gray-50 p-2 sm:p-6 text-xs md:text-sm">
      <div className="max-w-[1400px] mx-auto space-y-4 pb-10">
        
        {/* HEADER */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h1 className="text-xl font-bold text-gray-800 flex items-center">
             <GlassWater className="mr-2 text-blue-600" /> Hệ Thống Hoa Hồng Bán Rượu
          </h1>
        </div>

        <Tabs defaultValue="manage" className="w-full">
          <TabsList className="mb-2 h-9 bg-white border shadow-sm">
            <TabsTrigger value="manage" className="text-sm data-[state=active]:bg-blue-50">Nhập Bill & Lịch Sử</TabsTrigger>
            <TabsTrigger value="summary" className="text-sm data-[state=active]:bg-blue-50">Thống Kê Tổng Hợp</TabsTrigger>
          </TabsList>

          <TabsContent value="manage" className="m-0">
            <div className="flex flex-col lg:flex-row gap-4">
              
              {/* ======================= */}
              {/* CỘT TRÁI: FORM NHẬP BILL */}
              {/* ======================= */}
              <div className="w-full lg:w-[45%] flex flex-col gap-4">
                <Card className="border-gray-200 shadow-sm sticky top-0">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex justify-between items-center border-b pb-2 mb-2">
                      <h2 className="font-semibold text-base text-gray-800">
                        {editId ? "Sửa Bill Rượu" : "Nhập Bill Mới"}
                      </h2>
                      {editId && <Badge className="bg-yellow-500 hover:bg-yellow-600">Đang Sửa</Badge>}
                    </div>

                    {/* DÒNG 1: THÔNG TIN CƠ BẢN */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-bold text-gray-600 block mb-1">Ngày bán *</label>
                        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-8 text-xs bg-white w-full" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-600 block mb-1">Nhân viên FOH *</label>
                        <SelectUI value={staffName} onValueChange={setStaffName}>
                          <SelectTrigger className="h-8 text-xs bg-white"><SelectValue placeholder="Chọn..."/></SelectTrigger>
                          <SelectContent>
                            {masterStaff.map(s => <SelectItem key={s._id} value={s.name} className="text-xs">{s.name}</SelectItem>)}
                          </SelectContent>
                        </SelectUI>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-600 block mb-1">Tên Khách Hàng</label>
                        <Input placeholder="VD: Mr Hoàng..." value={customerName} onChange={e => setCustomerName(e.target.value)} className="h-8 text-xs bg-white w-full" />
                      </div>
                    </div>

                    {/* DÒNG 2: THÊM ITEM RƯỢU VỚI TÌM KIẾM AUTOCOMPLETE */}
                    <div className="bg-blue-50/50 p-3 rounded border border-blue-100 space-y-3">
                      <h3 className="text-xs font-bold text-blue-800 border-b border-blue-200 pb-1">Chi Tiết Rượu Trong Bill</h3>
                      
                      <div className="flex items-end gap-2 relative">
                        <div className="flex-1 relative">
                          <label className="text-[10px] font-bold text-gray-600 block mb-1">Tên Rượu</label>
                          <Input
                            value={wineSearch}
                            onChange={(e) => {
                              setWineSearch(e.target.value);
                              setShowWineDropdown(true);
                              setSelectedWineId(""); // Đặt lại ID nếu user gõ thay đổi
                            }}
                            onFocus={() => setShowWineDropdown(true)}
                            onBlur={() => setTimeout(() => setShowWineDropdown(false), 200)}
                            placeholder="Nhập tên rượu để tìm..."
                            className="h-8 text-xs bg-white w-full"
                          />
                          {/* Dropdown Gợi Ý Rượu */}
                          {showWineDropdown && wineSearch && (
                            <div className="absolute z-50 w-full bg-white border border-gray-200 rounded shadow-lg max-h-48 overflow-y-auto mt-1">
                              {wineData
                                .filter(w => w.name.toLowerCase().includes(wineSearch.toLowerCase()))
                                .map(w => (
                                  <div
                                    key={w.id}
                                    onMouseDown={(e) => {
                                      e.preventDefault(); // Ngăn input mất focus
                                      setSelectedWineId(w.id);
                                      setWineSearch(w.name);
                                      setShowWineDropdown(false);
                                    }}
                                    className="p-2 text-xs hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0"
                                  >
                                    {w.name} - <span className="font-semibold text-blue-600">{formatVND(w.price)}</span>
                                  </div>
                                ))}
                              {wineData.filter(w => w.name.toLowerCase().includes(wineSearch.toLowerCase())).length === 0 && (
                                <div className="p-2 text-xs text-gray-500 text-center">Không tìm thấy loại rượu này</div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="w-[60px]">
                          <label className="text-[10px] font-bold text-gray-600 block mb-1">SL</label>
                          <Input type="number" value={selectedQuantity} onChange={e => setSelectedQuantity(Number(e.target.value))} className="h-8 text-xs bg-white text-center px-1" placeholder="0" />
                        </div>
                        <Button onClick={handleAddItemToBill} className="h-8 px-3 bg-blue-600 text-xs"><PlusCircle className="w-3 h-3 mr-1"/> Thêm</Button>
                      </div>

                      {/* BẢNG ITEM ĐÃ THÊM */}
                      {billItems.length > 0 && (
                        <div className="border rounded overflow-hidden mt-2 bg-white">
                          <Table>
                            <TableHeader className="bg-gray-100">
                              <TableRow>
                                <TableHead className="text-[10px] p-1 pl-2 font-bold h-6">Tên Rượu</TableHead>
                                <TableHead className="text-[10px] p-1 text-center font-bold h-6 w-[40px]">SL</TableHead>
                                <TableHead className="text-[10px] p-1 text-right font-bold h-6">Thành Tiền</TableHead>
                                <TableHead className="w-[30px] p-1"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {billItems.map((item, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="text-[11px] p-1 pl-2 border-r truncate max-w-[150px]" title={item.wineName}>{item.wineName}</TableCell>
                                  <TableCell className="text-[11px] p-1 border-r text-center font-bold">{item.quantity}</TableCell>
                                  <TableCell className="text-[11px] p-1 border-r text-right font-semibold text-gray-700">{formatVND(item.price * item.quantity)}</TableCell>
                                  <TableCell className="text-[11px] p-1 text-center">
                                    <button onClick={() => handleRemoveItemFromBill(idx)} className="text-red-500 hover:text-red-700">❌</button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>

                    {/* DÒNG 3: HIỂN THỊ TỔNG KẾT BILL & NÚT LƯU */}
                    <div className="bg-gray-50 p-3 rounded border border-gray-200">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-gray-600">TỔNG TIỀN BILL:</span>
                        <span className="text-lg font-black text-gray-800">{formatVND(currentCalculations.totalBill)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-green-700">HOA HỒNG NHẬN ĐƯỢC:</span>
                          {currentCalculations.hasVip && <span className="text-[9px] text-red-500 font-bold tracking-tight">(Áp dụng mốc 10% chai VIP)</span>}
                        </div>
                        <span className="text-2xl font-black text-green-600">{formatVND(currentCalculations.commission)}</span>
                      </div>

                      <div className="flex gap-2 mt-4 pt-3 border-t">
                         <Button onClick={handleSaveBill} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold h-9">
                            <Save className="w-4 h-4 mr-2" /> {editId ? "CẬP NHẬT BILL NÀY" : "LƯU VÀO SỔ"}
                         </Button>
                         {editId && (
                           <Button onClick={resetForm} variant="outline" className="h-9">Hủy Sửa</Button>
                         )}
                      </div>
                    </div>

                  </CardContent>
                </Card>
              </div>

              {/* ======================= */}
              {/* CỘT PHẢI: BẢNG LỊCH SỬ CHI TIẾT */}
              {/* ======================= */}
              <div className="w-full lg:w-[55%]">
                <Card className="border-gray-200 shadow-sm h-full">
                   <div className="p-3 bg-gray-100 border-b border-gray-200">
                      <h3 className="font-bold text-gray-700 text-sm">Lịch Sử Các Bill Đã Nhập</h3>
                   </div>
                   <div className="overflow-x-auto h-[600px] relative">
                     <table className="w-full text-xs text-left">
                       <thead className="bg-gray-50 text-gray-600 sticky top-0 shadow-sm">
                         <tr>
                           <th className="p-2 border-b border-r w-[80px]">Ngày</th>
                           <th className="p-2 border-b border-r w-[120px]">Nhân Viên</th>
                           <th className="p-2 border-b border-r">Rượu Bán Được</th>
                           <th className="p-2 border-b border-r text-right w-[90px]">Tổng Tiền</th>
                           <th className="p-2 border-b border-r text-right font-bold text-green-700 w-[90px]">Hoa Hồng</th>
                           <th className="p-2 border-b border-r w-[100px]">Khách Hàng</th>
                           <th className="p-2 border-b text-center w-[70px]">Thao tác</th>
                         </tr>
                       </thead>
                       <tbody>
                         {bills.length === 0 && (
                           <tr><td colSpan={7} className="text-center p-8 text-gray-400">Chưa có dữ liệu bill nào.</td></tr>
                         )}
                         {bills.map(bill => (
                           <tr key={bill._id} className={`border-b hover:bg-gray-50 ${editId === bill._id ? 'bg-yellow-50' : ''}`}>
                             <td className="p-2 border-r">{new Date(bill.date).toLocaleDateString('vi-VN')}</td>
                             <td className="p-2 border-r font-bold text-blue-700">{bill.staffName}</td>
                             <td className="p-2 border-r text-[10px] text-gray-600 max-w-[200px] whitespace-normal">
                               <ul className="list-disc pl-3">
                                 {bill.items.map((i: any, idx: number) => (
                                   <li key={idx}>[{i.quantity}] {i.wineName}</li>
                                 ))}
                               </ul>
                             </td>
                             <td className="p-2 border-r text-right font-semibold">{formatVND(bill.totalBillAmount)}</td>
                             <td className="p-2 border-r text-right font-bold text-green-600">
                               {formatVND(bill.commissionEarned)}
                               {bill.isVipRuleApplied && <div className="text-[8px] text-red-500 leading-tight mt-0.5">VIP (10%)</div>}
                             </td>
                             <td className="p-2 border-r truncate max-w-[100px]" title={bill.customerName}>{bill.customerName}</td>
                             <td className="p-2 text-center">
                               <button onClick={() => handleEditBillClick(bill)} className="text-blue-500 hover:text-blue-700 mx-1">✏️</button>
                               <button onClick={() => handleDeleteBill(bill._id)} className="text-red-500 hover:text-red-700 mx-1">❌</button>
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="summary" className="m-0">
            <Card className="border-gray-200 shadow-sm max-w-[800px] mx-auto mt-4">
              <div className="p-4 bg-blue-50 border-b border-blue-200 flex justify-between items-center">
                 <h3 className="font-bold text-blue-800 text-base">TỔNG HỢP HOA HỒNG RƯỢU THEO NHÂN VIÊN FOH</h3>
              </div>
              <Table>
                <TableHeader className="bg-white">
                  <TableRow>
                    <TableHead className="font-bold text-gray-700">Tên Nhân Viên</TableHead>
                    <TableHead className="font-bold text-gray-700 text-center">Tổng Số Chai Đã Bán</TableHead>
                    <TableHead className="font-bold text-green-700 text-right text-base">TỔNG HOA HỒNG NHẬN</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffSummary.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center h-20 text-gray-400">Không có dữ liệu</TableCell></TableRow>
                  ) : (
                    staffSummary.map((staff, idx) => (
                      <TableRow key={idx} className="hover:bg-gray-50 border-b">
                        <TableCell className="font-semibold text-sm">{staff.name}</TableCell>
                        <TableCell className="text-center font-medium text-gray-600">{staff.totalBottles} chai</TableCell>
                        <TableCell className="text-right font-black text-green-600 text-base">{formatVND(staff.totalComm)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}