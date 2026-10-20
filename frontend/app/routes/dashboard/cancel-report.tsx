import React, { useState, useMemo, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select as SelectUI, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Search, Calendar, RefreshCcw, FileWarning, Trash2, CheckSquare, Minus, Plus, Edit3, XCircle, FileText, ClipboardList, PlusCircle, ArrowUpDown, Receipt, FileSpreadsheet, ClipboardPaste } from "lucide-react";
import { fetchData, postData, updateData, deleteData } from "@/lib/fetch-util";
import * as XLSX from 'xlsx';

// ==========================================
// DATA MÓN TĨNH (TỪ EXCEL) - BẠN TỰ PASTE VÀO ĐÂY
// ==========================================
const initialCancelData: any[] = [
  { category: "Combo", name: "WOMEN'S DAY  2025", price: 1300000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU MAKER'S MARK", price: 2000000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU JOHNNIE WALKER BLUE LABEL", price: 8000000 },
  { category: "Món ăn", name: "Râu Mực Chiên Giòn (Ikagesho Karaage)", price: 149000 },
  { category: "Món ăn", name: "VIB_Bụng cá hồi Sashimi/ Salmon belly sashimi", price: 352734 },
  { category: "Món ăn", name: "Sò Điệp Xào Măng Tây", price: 279000 },
  { category: "Món ăn", name: "Bánh Dân Gian", price: 500000 },
  { category: "Đồ uống đóng chai", name: "Rượu sâm G-Tiso 19% ( Glass )", price: 180000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU BOWMORE 15", price: 4800000 },
  { category: "Món ăn", name: "Kem Trà Xanh", price: 119000 },
  { category: "Món ăn", name: "SET MENU 1200++ (Khổ qua, Gỏi cuốn, Đậu bắp, Cá bống đục, Cá lăng nướng, Soup cá thu lá é, Cơm chiên tỏi )", price: 1200000 },
  { category: "Món ăn", name: "Cơm Chiên Hải Sản, Trứng Cá Tuyết", price: 249000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU Umeshu Kodawari Mi-Iri Nakata / 720ML / 12%", price: 1600000 },
  { category: "Món ăn", name: "03 Lựa Chọn by Chef/Three Kinds of Assorted Sashimi Chef Choice", price: 579000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU JOSE CUREVO REPOSADO", price: 1200000 },
  { category: "Món ăn", name: "Cơm Chiên Tỏi", price: 99000 },
  { category: "Món ăn", name: "FG. Hàu Nướng Mỡ Hành (con)", price: 160000 },
  { category: "Món ăn", name: "FG. Vegetable salad/Salad rau củ", price: 120000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU MACALLAN 15 DOUBLE CASK", price: 860000 },
  { category: "Đồ uống pha chế", name: "RƯỢU NOJI HIBALL", price: 255000 },
  { category: "Món ăn", name: "Cá Tráp Đỏ", price: 249000 },
  { category: "Món ăn", name: "Khô Cá Dứa & Cơm Nắm", price: 279000 },
  { category: "Đồ uống pha chế", name: "NƯỚC MANGO JAPANESE", price: 185000 },
  { category: "Món ăn", name: "Sò Điệp & Gan Ngỗng Áp Chảo, Xốt Kem Miso", price: 219000 },
  { category: "Món ăn", name: "FG. FUGU Seafood Platter/Đảo hải sản cao cấp FUGU(6 vẹm, 6 hàu, 6 tôm sú)", price: 3874000 },
  { category: "Món ăn", name: "FG. Japanese wagyu vegetable rolls with teriyaki sauce/Bò wagyu nhật cuộn rau củ với sốt teriyaki", price: 260000 },
  { category: "Món ăn", name: "SET LUNCH 449++ ( Khoai tây, Sò điệp xào, Thị kho nước tương, Cá hồng chiên sả, canh bầu nấu tôm, Dưa lưới )", price: 449000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU Villa Maria, Private Bin Sauvignon, Marlborough, Sauvignon Blanc", price: 1100000 },
  { category: "Món ăn", name: "Trứng Cá Hồi/ Salmon Roe Sushi", price: 249000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU GLENFIDDICH 15", price: 520000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU CHIVAS MINUZARA", price: 255000 },
  { category: "Món ăn", name: "FG. Ocean garden roll/Cuộn cá ngừ và cá hồi cao cấp", price: 686000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU BELDEVERE", price: 2200000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU Alvaro Palacios, La Vendimia, Garnacha/ Tempranillo", price: 1100000 },
  { category: "Món ăn", name: "Gà hấp muối xá kén", price: 279000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU CHIVAS REGAL 18 BLUE SIGNATURE", price: 350000 },
  { category: "Món ăn", name: "FG. Stone bowl wagyu beef rice/Cơm bò wagyu nhật ( thố đá )", price: 840000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU Trimbach, Gewurztraminer, Alsace", price: 1700000 },
  { category: "Món ăn", name: "FG. Combo 9 kinds skewers/Xiên tổng hợp 9 loại", price: 490000 },
  { category: "Món ăn", name: "FG. Set Lunch/ Set Ăn Trưa VIP", price: 400000 },
  { category: "Combo", name: "VALENTINE 2025", price: 3500000 },
  { category: "Đồ uống đóng chai", name: "NƯỚC DIET COKE / 320ML", price: 60000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU MATSUI KURAYOSHI 8YO", price: 6000000 },
  { category: "Món ăn", name: "Cơm Chiên Cá Mặn", price: 99000 },
  { category: "Món ăn", name: "FG. Minced wagyu congee/Cháo thịt bò wagyu bầm", price: 360000 },
  { category: "Món ăn", name: "FG. Miso soup/Súp miso", price: 59000 },
  { category: "Món ăn", name: "Món French Fries - Britcharm", price: 69665 },
  { category: "Món ăn", name: "Bắp xào", price: 149000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU CHAMPAGNE Delamotte, Brut,France", price: 2500000 },
  { category: "Món ăn", name: "05 Lựa Chọn by Chef/Five  Kinds of Assorted Sashimi Chef Choice", price: 1279000 },
  { category: "Món ăn", name: "TRÁI CÂY THEO MÙA 2", price: 600000 },
  { category: "Món ăn", name: "Đậu phộng rang muối / Salted Roasted Peanuts", price: 69000 },
  { category: "Món ăn", name: "SET MENU 1500 ++ ( Tủy bò, Soup Nghêu Sake, Ba rọi chiên, Cá bơm, Cơm chiên tỏi, Đậu phộng, bacon măng tây, trái cây )", price: 1500000 },
  { category: "Món ăn", name: "Checkin.Khoai tây chiên và sốt kem nấm", price: 0 },
  { category: "Đồ uống đóng chai", name: "RƯỢU SAKE Dassai 39 16% -300ml", price: 950000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU BALLANTINE 21", price: 5200000 },
  { category: "Món ăn", name: "Vú heo nướng chao + Đậu bắp", price: 379000 },
  { category: "Món ăn", name: "Hàu Cháy Cạnh, Nấm Truffle, Xốt Chanh Dây Cay", price: 179000 },
  { category: "Món ăn", name: "FG. Oysters Congee/Cháo hàu nhật", price: 159000 },
  { category: "Món ăn", name: "Đậu phộng / Peanuts", price: 59000 },
  { category: "Đồ uống pha chế", name: "RƯỢU TOKYO TWILIGHT BO", price: 500000 },
  { category: "Món ăn", name: "Xiên Nướng Rau Củ Tổng Hợp", price: 179000 },
  { category: "Món ăn", name: "Checkin. Salt-Roasted Ginkgo Nuts/Bạch quả rang muối", price: 0 },
  { category: "Món ăn", name: "Đĩa Khai Vị Tổng Hợp", price: 279000 },
  { category: "Món ăn", name: "FG. Sườn cừu Úc với sốt cà ri Nhật", price: 385000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU CHIVAS REGAL 18 BLUE SIGNATURE", price: 3800000 },
  { category: "Đồ uống đóng chai", name: "SOFT DRINK MIX NƯỚC DIET COKE / 320ML", price: 0 },
  { category: "Đồ uống đóng chai", name: "RƯỢU Chateau Hyon la Fleur,Merlot / Cabernet Sauvignon", price: 4000000 },
  { category: "Món ăn", name: "FG. Flower 1/ Hoa ngọt", price: 650000 },
  { category: "Món ăn", name: "Bạch Tuộc  Wasabi", price: 119000 },
  { category: "Món ăn", name: "Bạch quả rang muối - Roasted gingko nuts", price: 85000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU CHAMPAGNE Tribaut Schloesser 750ml, 12-15%", price: 2600000 },
  { category: "Đồ uống đóng chai", name: "Rượu sâm Hercule 40%", price: 3100000 },
  { category: "Món ăn", name: "SET MENU 1500++ ( Bánh mì bơ, Súp nạm bò, Salad dầu giấm, Cá răng, Bò Topblade Mỹ, Miến thịt cua, Kem vani )", price: 1500000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU MARTELL X.O", price: 8800000 },
  { category: "Món ăn", name: "FuGu. Set Menu 6", price: 530000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU Rimapere by Baron Edmond de Rothschild", price: 1400000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU BOWMORE 12", price: 2500000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU CHIVAS REGAL 25", price: 10500000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU SAKE Dassai 23 16% -720ml", price: 3800000 },
  { category: "Món ăn", name: "Fried soft-shell crab / Cua lột chiên", price: 199000 },
  { category: "Đồ uống đóng chai", name: "NƯỚC GINGER ALE / 320ML", price: 60000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU ABSOLUTE ELYX 1L", price: 3400000 },
  { category: "Món ăn", name: "FG. Set Lunch/ Set Ăn Trưa VIP Chay", price: 300000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU Vidal Estate by Villa Maria, Sauvignon Blanc, Malborough Valley", price: 900000 },
  { category: "Món ăn", name: "FG. Grilled salmon head with salt/Đầu cá hồi nướng muối", price: 230000 },
  { category: "Món ăn", name: "FG. Mixed 5 kinds sashimi/Sashimi 5 loại tổng hợp", price: 790000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU GREY GOOSE", price: 2200000 },
  { category: "Món ăn", name: "FG. Ebi tempura/Tempura tôm sú biển", price: 240000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU GLENFIDDICH 18", price: 6200000 },
  { category: "Đồ uống pha chế", name: "RƯỢU WHISKY SOUR", price: 225000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU HENNESSY X.O", price: 780000 },
  { category: "Món ăn", name: "Tôm Hùm Baby Nướng Xốt Trứng Cá Tuyết", price: 899000 },
  { category: "Món ăn", name: "FG. Deep Fried Anchovy/Cá cơm chiên giòn", price: 59000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU MATSUI MIZUNARA CASK", price: 680000 },
  { category: "Combo", name: "Combo Khai Vị ( Bò nướng vỉ, Râu mực chiên sốt Dashi, Sụn gà ramg muối Cajun )", price: 500000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU THE GLENLIVET 18", price: 580000 },
  { category: "Món ăn", name: "Khai vị", price: 0 },
  { category: "Đồ uống đóng chai", name: "RƯỢU KRAKEN", price: 210000 },
  { category: "Đồ uống đóng chai", name: "Rượu sâm Victoria 34%", price: 3100000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU Cum Laude - Banfi Toscana, Italy", price: 1900000 },
  { category: "Món ăn", name: "FUGU.SET Iberico pork fried rice/Cơm chiên thịt heo Iberico", price: 0 },
  { category: "Món ăn", name: "Món Grilled Stingray Fins - Britcharm", price: 119929 },
  { category: "Món ăn", name: "Xiên Nướng Tổng Hợp (05 Loại)", price: 379000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU ABSOLUTE ELYX 1L", price: 380000 },
  { category: "Món ăn", name: "FG. Sashimi Bluefin Tuna/Cá ngừ vây xanh(chutoro)", price: 520000 },
  { category: "Món ăn", name: "WD.CÁ NGỪ TATAKI VỚI SỐT PONZU", price: 0 },
  { category: "Đồ uống pha chế", name: "Rượu Midori Mist 2026", price: 99000 },
  { category: "Đồ uống pha chế", name: "RƯỢU PANDAN JAPANESE", price: 1200000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU Chateau Clinet, Pomerol, Bordeaux Blend", price: 6800000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU KINGSTON 62 WHITE", price: 150000 },
  { category: "Món ăn", name: "Mì Nước Ramen, Ức Vịt Nướng ,Truffle", price: 219000 },
  { category: "Món ăn", name: "Rau Luộc Thập Cẩm", price: 179000 },
  { category: "Món ăn", name: "Salad Hải Sản sốt Saikyo Miso", price: 349000 },
  { category: "Đồ uống pha chế", name: "NƯỚC LICHI FIZZ 2026", price: 99000 },
  { category: "Món ăn", name: "Tôm Tempura/Prawn Tempura", price: 279000 },
  { category: "Món ăn", name: "Xương Tủy Bò", price: 249000 },
  { category: "Đồ uống pha chế", name: "RƯỢU SSIE KIK", price: 255000 },
  { category: "Món ăn", name: "FG. Mushroom clams soup/Súp nghêu hấp nấm", price: 110000 },
  { category: "Món ăn", name: "Món canape 2H", price: 950000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU THE GLENLIVET 25", price: 20000000 },
  { category: "Món ăn", name: "Blue Fin Fatty Tuna Bụng Cá Ngừ Sashimi", price: 679000 },
  { category: "Món ăn", name: "Món Assorted Grilled 5 Skewers- Britcharm", price: 264550 },
  { category: "Đồ uống đóng chai", name: "RƯỢU JOHNNIE WALKER BLUE LABEL", price: 860000 },
  { category: "Món ăn", name: "Rau Xào & Nấm Thập Cẩm", price: 149000 },
  { category: "Món ăn", name: "Grilled corn / Bắp nướng", price: 79000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU Bottega, Millesimato Brut, Spumante Bianco,Veneto, Italy", price: 900000 },
  { category: "Món ăn", name: "Cá Nâu Kho", price: 249000 },
  { category: "Đồ uống đóng chai", name: "Rượu sâm HK 19% ( Glass )", price: 150000 },
  { category: "Combo", name: "SET MENU 2500++", price: 2500000 },
  { category: "Món ăn", name: "CB_SET HALLOWEEN 2025", price: 1200000 },
  { category: "Món ăn", name: "Cá Cam Sốt Yuzu/ Kanpachi", price: 279000 },
  { category: "Đồ uống đóng chai", name: "NƯỚC RED BULL / 250ML", price: 60000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU Torres, Vina Esmeralda Semi Dry White, Gewurztraminer Moscato", price: 900000 },
  { category: "Đồ uống đóng chai", name: "SOFT DRINK MIX NƯỚC SODA / 320ML", price: 0 },
  { category: "Món ăn", name: "Garlic Butter Razor Clams / Ốc móng tay sốt bơ tỏi", price: 149000 },
  { category: "Món ăn", name: "VIB_Mang cá cam nướng muối ớt Wasabi/ Grilled yellowtail collar with wasabi, chili salt", price: 352734 },
  { category: "Món ăn", name: "Grilled Shiitake / Nấm đông cô nướng", price: 49000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU CHAMPAGNE Salon, Le Mesnil Blanc de Blancs, France", price: 45000000 },
  { category: "Món ăn", name: "Lòng bò Chiên Xốt Ponzu/Deep-Fried  Intestines, Ponzu Sauce", price: 149000 },
  { category: "Món ăn", name: "Má Heo Iberico Nướng Sốt Cay", price: 349000 },
  { category: "Món ăn", name: "KEM VINALA", price: 50000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU Chateau Malescot St Exupery, Margaux 3rd Grand Cru Classe, Bordeaux Blend", price: 5000000 },
  { category: "Đồ uống pha chế", name: "BIA TIGER DRAFT / GLASS ( 500ML )", price: 155000 },
  { category: "Món ăn", name: "Salad Cua Lột Tempura, Xốt Mè Rang ( Lớn )", price: 1279000 },
  { category: "Đồ uống đóng chai", name: "BIA SAPPORO / 330ML", price: 75000 },
  { category: "Món ăn", name: "FG. Mixed 7 kinds sushi/Sushi 7 loại tổng hợp", price: 950000 },
  { category: "Combo", name: "SET MENU 2300++", price: 2300000 },
  { category: "Món ăn", name: "FG. Premium tomahawl streak/Sườn bò tomahawl thượng hạng", price: 3850000 },
  { category: "Combo", name: "SET MENU 1900++", price: 1900000 },
  { category: "Món ăn", name: "WD.MOCHI VANILLA", price: 0 },
  { category: "Món ăn", name: "Grilled Salted Salmon Head / Đầu cá hồi nướng muối", price: 149000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU Gunderloch, \"Fritz\" ,Riesling", price: 1000000 },
  { category: "Combo", name: "SET MENU 1200++", price: 1200000 },
  { category: "Đồ uống đóng chai", name: "BIA TIGER  CRYSTAL", price: 75000 },
  { category: "Món ăn", name: "FG. Mixed 3 kinds sashimi/Sashimi 3 loại tổng hợp", price: 390000 },
  { category: "Món ăn", name: "Kem Matcha", price: 119000 },
  { category: "Món ăn", name: "Salad Dầu Giấm", price: 179000 },
  { category: "Món ăn", name: "SEA URCHIN Sushi / SUSHI CẦU GAI ( NHUM)", price: 350000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU Ronan By Chateau Clinet,Merlot", price: 1200000 },
  { category: "Món ăn", name: "FG. Grilled oysters with cheese/Hàu nướng phô mai", price: 430000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU BOWMORE 18", price: 680000 },
  { category: "Món ăn", name: "FG. Flower 2/ Hoa ngọt", price: 3000000 },
  { category: "Đồ uống đóng chai", name: "NƯỚC SPRITE / 320ML", price: 60000 },
  { category: "Món ăn", name: "FG. Mixed 7 kinds sashimi/Sashimi 7 loại tổng hợp", price: 1290000 },
  { category: "Món ăn", name: "FG. Japanese eel pan-fried rice/Cơm chiên lươn áp chảo kiểu nhật", price: 310000 },
  { category: "Món ăn", name: "Khô Cá Lóc", price: 249000 },
  { category: "Món ăn", name: "Tôm Ngọt/ Sweet Shrimp Sashimi", price: 299000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU 1800 CRISTALINO", price: 380000 },
  { category: "Món ăn", name: "Thăn Cá Ngừ Sashimi", price: 499000 },
  { category: "Món ăn", name: "Japanese-style Fried Dumplings /  Há cảo chiên kiểu Nhật", price: 99000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU JACK DANIEL", price: 1500000 },
  { category: "Món ăn", name: "Kem vani", price: 119000 },
  { category: "Món ăn", name: "FG. Kuro maguro symphony set/Sườn cá ngừ vây xanh thượng hạng", price: 3490000 },
  { category: "Đồ uống đóng chai", name: "BIA HEINEKEN / 330ML", price: 75000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU WILD TURKEY 8 YEAR", price: 250000 },
  { category: "Món ăn", name: "Cơm trắng", price: 30000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU SAKE Kubota Junmai Daiginjo 15% 720ml", price: 1500000 },
  { category: "Món ăn", name: "Thăn Cá Ngừ/ Blue Fin Lean Tuna Sushi", price: 249000 },
  { category: "Món ăn", name: "Dưa lưới", price: 0 },
  { category: "Món ăn", name: "V.Rainbow Salad (Xà Lách Cầu Vồng)", price: 0 },
  { category: "Đồ uống pha chế", name: "RƯỢU NEGRONI", price: 225000 },
  { category: "Món ăn", name: "Soup Miso Nghêu / Miso Clam Soup", price: 79000 },
  { category: "Món ăn", name: "Bụng Cá Hồi/Salmon Belly Sashimi", price: 199000 },
  { category: "Món ăn", name: "Tôm, Cá Trắng, Mực, Rau & Nấm Chiên Tempura, Xốt Tương Nấm Trufle", price: 349000 },
  { category: "Món ăn", name: "Steamed egg / Trứng hấp hải sản", price: 79000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU MATSUI MIZUNARA CASK", price: 6000000 },
  { category: "Món ăn", name: "Cá Hồi Nướng Sốt Teri Trái Mơ", price: 279000 },
  { category: "Món ăn", name: "Cá Răng Nam Cực Nướng Sốt Saikyo Miso", price: 649000 },
  { category: "Đồ uống đóng chai", name: "SOFT DRINK MIX NƯỚC SPRITE / 320ML", price: 0 },
  { category: "Món ăn", name: "FG. Salmon caviar with paro sauce/Cá hồi sốt paro và caviar", price: 750000 },
  { category: "Món ăn", name: "Sò Điệp/Scallop Sashimi", price: 249000 },
  { category: "Món ăn", name: "Cá Tráp Đỏ Nhật Áp Chảo, Xốt Bơ Tỏi Nấm Trufle", price: 449000 },
  { category: "Món ăn", name: "KEM MOCHI NHẬT", price: 50000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU NAKED MALT", price: 2000000 },
  { category: "Món ăn", name: "SET MENU 1290++ ( Tuỷ bò, Hến xúc, Đậu hủ mắm hành, Cá hồng áp chảo, Ếch xào , Súp đuôi bò)", price: 1290000 },
  { category: "Đồ uống đóng chai", name: "NƯỚC SUỐI LAVIE", price: 60000 },
  { category: "Món ăn", name: "Sò Điệp Xào, Xốt Cay X.O Nhật", price: 249000 },
  { category: "Mặt hàng khác", name: "Phí Corkage charge 1000", price: 1000000 },
  { category: "Món ăn", name: "FG. Grilled beef with teriyaki sauce/Bò waygu nướng sốt Teriyaki", price: 159000 },
  { category: "Món ăn", name: "Cá Mú Hấp", price: 349000 },
  { category: "Món ăn", name: "Sò Điệp Sốt Kimchi Hàn Quốc", price: 179000 },
  { category: "Món ăn", name: "V.Vanilla Ice Cream with Fruit (Kem Vanilla Trái Cây)", price: 0 },
  { category: "Món ăn", name: "Cá Saba Nhật Nướng Nguyên Miếng", price: 249000 },
  { category: "Món ăn", name: "FG. Sashimi Sea Urchin/Sashimi cầu gai", price: 690000 },
  { category: "Món ăn", name: "VIB_Lươn nhật nướng muối ớt  dùng kèm cơm sushi áp chảo mỡ hành", price: 352734 },
  { category: "Món ăn", name: "Striploin Black Angus (150 ngày) Sốt Tiêu Đen và Wasabi Kizami", price: 749000 },
  { category: "Món ăn", name: "Hến Bánh Đa ( Lớn )", price: 498000 },
  { category: "Món ăn", name: "FG. Mochi 1 viên", price: 59000 },
  { category: "Món ăn", name: "SET.FUGU Miso soup/Súp miso", price: 0 },
  { category: "Món ăn", name: "Mì Nước Udon Hải Sản, Súp  Cay", price: 279000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU HAKU", price: 210000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU BELDEVERE", price: 275000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU HIBIKI HARMONY", price: 650000 },
  { category: "Món ăn", name: "FG. MÌ RAMEN ( 1VAT)", price: 50000 },
  { category: "Đồ uống đóng chai", name: "Rượu sâm Victoria 34% ( Glass )", price: 330000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU Masi Costasera, Amarone della Valpolicella Classico DOCG,Corvina/ Rondinella /Molinara,Italy", price: 3800000 },
  { category: "Món ăn", name: "Cá hồng biển nướng muối ớt", price: 279000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU CHAMPAGNE Taittinger, Prelude Grands Crus Brut, France", price: 5200000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU THE GLENLIVET 18", price: 6800000 },
  { category: "Món ăn", name: "07 Lựa Chọn by Chef/ Seven Kinds of Assorted Sashimi Chef Choice", price: 2249000 },
  { category: "Món ăn", name: "SALMON Roe Sashimi / TRỨNG CÁ HỒI", price: 289000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU SAKE Kubota Senju Ginjo 15% 300ml", price: 500000 },
  { category: "Món ăn", name: "CB8_SET 2: SUSHI ĐB + SALAD TÔM", price: 2000000 },
  { category: "Món ăn", name: "FG. Grilled lamb chops/Sườn cừu nướng", price: 360000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU LAPHROAIG 10", price: 2700000 },
  { category: "Đồ uống pha chế", name: "RƯỢU Ketel One vodka", price: 225000 },
  { category: "Đồ uống pha chế", name: "Nước chanh / LIME JUICE", price: 90000 },
  { category: "Đồ uống đóng chai", name: "Rượu sâm Thiên thần 19%", price: 1300000 },
  { category: "Món ăn", name: "FG. Crab claw salad/Salad càng cua", price: 220000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU JOSE CUREVO REPOSADO", price: 155000 },
  { category: "Món ăn", name: "FG. Trứng gà", price: 30000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU CLASE AZUL REPOSADO", price: 10000000 },
  { category: "Món ăn", name: "FG. Braised pork belly/Cơm thịt kho kiểu nhật", price: 450000 },
  { category: "Đồ uống pha chế", name: "NƯỚC Ép tắc xí muội", price: 68000 },
  { category: "Món ăn", name: "Sò Điệp Xốt Cay Kim Chi", price: 149000 },
  { category: "Món ăn", name: "SWEET JAPANESE SHRIMP Sushi / SUSHI TÔM NGỌT NHẬT", price: 169000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU SAKE Snow aged Junmai Daiginjo 3 years Hakkaisan (Yukimuro)17% (720ml)", price: 3600000 },
  { category: "Món ăn", name: "Kem Chanh Yuzu", price: 119000 },
  { category: "Món ăn", name: "Salad Bò Cháy Cạnh", price: 249000 },
  { category: "Món ăn", name: "Grilled Cheese Crab Shell / Mai cua nướng phô mai", price: 189000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU SMIRNOFF", price: 900000 },
  { category: "Đồ uống pha chế", name: "RƯỢU TOKYO TWILIGHT", price: 1200000 },
  { category: "Món ăn", name: "Soup Miso Cá Hồi", price: 149000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU HENNESSY VSOP", price: 320000 },
  { category: "Món ăn", name: "FG. Thiên Nam Combo", price: 1320000 },
  { category: "Món ăn", name: "Sushi & Sashimi Tổng Hợp", price: 1349000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU KINOBI KYOTO", price: 310000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU 1800 CRISTALINO", price: 3200000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU GLENFIDDICH 18", price: 680000 },
  { category: "Món ăn", name: "SET.Khoai tây chiên và sốt kem nấm", price: 0 },
  { category: "Combo", name: "FUGU.SET THANH XUÂN 3", price: 1200000 },
  { category: "Đồ uống đóng chai", name: "Rượu sâm Hercule 40% ( Glass )", price: 330000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU BULLEIT", price: 180000 },
  { category: "Đồ uống đóng chai", name: "NƯỚC SODA / 320ML", price: 60000 },
  { category: "Món ăn", name: "Fried Seaweed / Rong biển chiên giòn", price: 59000 },
  { category: "Món ăn", name: "Cải Thìa Xào Tỏi", price: 149000 },
  { category: "Món ăn", name: "FG. Oden hot-pot/Lẩu Oden", price: 360000 },
  { category: "Món ăn", name: "Trứng Hấp Ghẹ Xanh Với Trứng Cá Hồi", price: 249000 },
  { category: "Đồ uống đóng chai", name: "NƯỚC PERRIER / 750ML", price: 130000 },
  { category: "Món ăn", name: "SET MENU 2200++: Bánh mì Pate gan ngỗng,Trứng cá Caviar, Cá hồi, Càng cua, Hến,Bò Wagyu A4, Cá răng, Lươn, Kem chanh", price: 2200000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU Concha Y Toro, Gran Reserva, Carmenere", price: 250000 },
  { category: "Món ăn", name: "Bụng Cá Hồi/ Salmon Belly Sushi", price: 149000 },
  { category: "Món ăn", name: "Súp Rong Biển Đậu Hũ", price: 59000 },
  { category: "Món ăn", name: "SET MENU 1000++ ( Salad khoai tây, Gà chiên Cajun, Cá hồi áp chảo, Súp bí đỏ, Bò Angus, Trái cây )", price: 1000000 },
  { category: "Món ăn", name: "SÒ ĐỎ/ Surf Clam Sashimi", price: 179000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU SAKE Kubota Senju Ginjo 15% 720ml", price: 1000000 },
  { category: "Món ăn", name: "FG. FUGU'S Special sushi/Sushi tổng hợp FUGU đặc biệt", price: 1700000 },
  { category: "Món ăn", name: "FG. TÍA TÔ THÊM", price: 50000 },
  { category: "Món ăn", name: "Cá Hồi/Salmon Sashimi", price: 149000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU BALLANTINE 21", price: 480000 },
  { category: "Món ăn", name: "Khoai tây chiên", price: 128000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU Concha Y Toro, Marques De Casa Concha Chardonnay", price: 1400000 },
  { category: "Món ăn", name: "SET MENU 1700++", price: 1700000 },
  { category: "Món ăn", name: "SET MENU 2200++ ( Bánh mì pate gan ngỗng, trứng caviar, cá hồi, Salad thịt cua, cá mú, Heo iberico, Miến xào lươn, trái cây )T", price: 2200000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU TANQUERAY", price: 2000000 },
  { category: "Món ăn", name: "Salmon Sushi / Sushi cá hồi", price: 79000 },
  { category: "Món ăn", name: "Cá Hồi Tataki", price: 249000 },
  { category: "Món ăn", name: "Khô gà / Dried Chicken", price: 110000 },
  { category: "Món ăn", name: "SET MENU 1500++ (Sò điệp, Sushi tôm, Hàu chiên, Sashimi, Tôm sú nướng, Cơm lươn, Súp Miso, Kem 2 vị)", price: 1500000 },
  { category: "Món ăn", name: "FG. Grilled ayu fish with salt/Cá Ayu nướng muối", price: 250000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU NAKED MALT", price: 250000 },
  { category: "Món ăn", name: "Cua Lột Chiên Tempura", price: 219000 },
  { category: "Món ăn", name: "FG. Wagyu cappachio/Bò wagyu cappachio", price: 589000 },
  { category: "Món ăn", name: "FG. Sashimi Fugu/Sashimi cá nóc", price: 599000 },
  { category: "Món ăn", name: "Đậu nành luộc muối - Boiled green beans", price: 78000 },
  { category: "Món ăn", name: "FG. Combo 7 kinds skewers/Xiên tổng hợp 7 loại", price: 390000 },
  { category: "Đồ uống đóng chai", name: "Rượu sâm Khai vị 19%", price: 1800000 },
  { category: "Đồ uống đóng chai", name: "NƯỚC TONIC / 320ML", price: 60000 },
  { category: "Món ăn", name: "Gà Chiên Kiểu Nhật", price: 149000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU Louis Jadot, Cote de Beaune Villages, Pinot Noir", price: 2000000 },
  { category: "Món ăn", name: "FG. RONG NHO THÊM", price: 70000 },
  { category: "Món ăn", name: "FG. Grilled crab shell with cheese/Mai cua nướng phô mai", price: 320000 },
  { category: "Món ăn", name: "FG. Sashimi Yellowtail/Sashimi Cá cam", price: 240000 },
  { category: "Món ăn", name: "FG. Grilled oysters with chilli miso sauce/Hàu nướng sốt miso ớt hiểm", price: 430000 },
  { category: "Đồ uống pha chế", name: "RƯỢU MOJITO", price: 225000 },
  { category: "Món ăn", name: "SET MENU 1500++ ( Soup bắp bò, Xương tủy bò, Hến xúc, Đậu hũ chiên thịt ba rọi, Cà hồng áp chảo )", price: 1500000 },
  { category: "Món ăn", name: "CB8_SET 5: TOMAHAWK + SALAD RONG BIỂN", price: 3850000 },
  { category: "Món ăn", name: "Gỏi Tôm Thịt / Shrimp & Pork Salad", price: 279000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU THE HAKUSHU DISTILLERS RESERVE", price: 6000000 },
  { category: "Món ăn", name: "Salad Cua Lột Tempura, Xốt Mè Rang", price: 279000 },
  { category: "Món ăn", name: "FG. Small plater - season of fruits/Trái cây theo mùa nhỏ", price: 400000 },
  { category: "Món ăn", name: "FG. Xà Lách Tôm Áp Chảo", price: 220000 },
  { category: "Món ăn", name: "FG. Fried soft-shell crab/Cua lột chiên giòn", price: 420000 },
  { category: "Món ăn", name: "Sò Điệp/Scallop Sushi", price: 199000 },
  { category: "Đồ uống pha chế", name: "Rượu Youth 2026", price: 99000 },
  { category: "Combo", name: "FUGU.SET THANH XUÂN 1", price: 650000 },
  { category: "Đồ uống pha chế", name: "Rượu Edible Sour 2026", price: 99000 },
  { category: "Món ăn", name: "Bông thiên lý xào bò", price: 349000 },
  { category: "Món ăn", name: "FG. NƯỚC LẨU THÊM", price: 50000 },
  { category: "Món ăn", name: "Lườn Cá Ngừ Sashimi", price: 579000 },
  { category: "Món ăn", name: "FG. FUGU hot-pot/Lẩu cá nóc", price: 1599000 },
  { category: "Món ăn", name: "FG. Grilled saury with salt/Cá thu đao nướng muối", price: 120000 },
  { category: "Món ăn", name: "Hàu Nhật Nướng, Xốt Trứng Cá Tuyết", price: 179000 },
  { category: "Món ăn", name: "FG. Sashimi Salmon/Sashimi cá hồi", price: 220000 },
  { category: "Món ăn", name: "Wagyu Steak (100gr) / Bò Wagyu Nhật Steak (100gr)", price: 850000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU MATSUI KURAYOSHI 8YO", price: 680000 },
  { category: "Đồ uống đóng chai", name: "SOFT DRINK MIX NƯỚC GINGER ALE / 320ML", price: 0 },
  { category: "Đồ uống đóng chai", name: "RƯỢU JACK DANIEL", price: 120000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU THE YAMAZAKI DISTILLERS RESERVE", price: 770000 },
  { category: "Đồ uống pha chế", name: "NƯỚC LICHI FIZZ", price: 185000 },
  { category: "Món ăn", name: "FG. Janpanese Scallops caviar with pasamic sauce/Sò điệp Nhật với sốt pasamic và caviar", price: 350000 },
  { category: "Món ăn", name: "FG. Salt-Roasted Ginkgo Nuts/Bạch quả rang muối", price: 59000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU SMIRNOFF", price: 110000 },
  { category: "Món ăn", name: "Bụng Cá Ngừ Cháy Cạnh, Xốt Yuzu Cay", price: 679000 },
  { category: "Món ăn", name: "Cơm chiên tỏi lớn", price: 179000 },
  { category: "Món ăn", name: "Cá Hồi Cháy Cạnh, Xốt Saikyo Miso", price: 249000 },
  { category: "Món ăn", name: "Ba Rọi Chiên Riềng Sả", price: 249000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU TANQUERAY", price: 210000 },
  { category: "Món ăn", name: "Hến Bánh Đa", price: 249000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU CHIVAS MINUZARA", price: 2000000 },
  { category: "Món ăn", name: "FG. Cajun frieds chitken/Gà chiên cajun & khoai tây", price: 200000 },
  { category: "Mặt hàng khác", name: "Corkage charge 500", price: 500000 },
  { category: "Đồ uống pha chế", name: "Maxim Signature", price: 255000 },
  { category: "Đồ uống đóng chai", name: "PERRIER 33CL", price: 65000 },
  { category: "Món ăn", name: "Súp Hải Sản, Nấm, Rau Củ", price: 179000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU MACALLAN 12 SHERRY CASK", price: 480000 },
  { category: "Món ăn", name: "FG. Premium beluga served with toast/Trứng cá tầm Beluga thượng hạng với bánh mì nướng", price: 6700000 },
  { category: "Món ăn", name: "FG. Clear soup ramen noodle/Mì ramen súp nước trong", price: 179000 },
  { category: "Món ăn", name: "Cá thu xốt vang", price: 249000 },
  { category: "Món ăn", name: "Cá Saba Nướng Muối", price: 149000 },
  { category: "Món ăn", name: "Tôm Ngọt, Xốt Chanh Dây", price: 349000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU SAKE Dassai 39 16% -720ml", price: 1900000 },
  { category: "Món ăn", name: "FG. Steamed Egg/Trứng hấp hải sản", price: 98000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU ROKU", price: 210000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU La Joya Gran Reserva Syrah", price: 900000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU WILD TURKEY 8 YEAR", price: 2000000 },
  { category: "Món ăn", name: "Grilled Salted Hokke Fish / Cá Hokke nướng muối", price: 229000 },
  { category: "Món ăn", name: "Sụn gà rang muối Cajun", price: 0 },
  { category: "Món ăn", name: "Fried chicken gizzard / Mề gà chiên giòn", price: 109000 },
  { category: "Món ăn", name: "SET.FUGU Crab claw salad/Salad càng cua", price: 0 },
  { category: "Đồ uống đóng chai", name: "RƯỢU HENDRICK'S", price: 2200000 },
  { category: "Món ăn", name: "FG. FUGU's special combo/Combo cá nóc đặc biệt", price: 4490000 },
  { category: "Món ăn", name: "FG. Tomyum seafood soup/Súp hải sản tomyum", price: 450000 },
  { category: "Đồ uống pha chế", name: "RƯỢU PALOMA", price: 225000 },
  { category: "Món ăn", name: "SET MENU ĐẶC BIỆT 2500++", price: 2500000 },
  { category: "Món ăn", name: "Cơm chiên tỏi nhỏ", price: 79000 },
  { category: "Đồ uống đóng chai", name: "Rượu sâm Khai vị 19% ( Glass )", price: 180000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU Vang F Negroamaro", price: 1800000 },
  { category: "Món ăn", name: "FG. French fried with creamy mushroom sauce/Khoai tây chiên và sốt kem nấm", price: 130000 },
  { category: "Đồ uống đóng chai", name: "Rượu sâm Premium 34%", price: 2000000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU Concha Y Toro, Gran Reserva, Carmenere", price: 1200000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU HENNESSY X.O", price: 8900000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU Chateau Palmer 2008, Margaux 3rd Grand Cru Classe, Merlot/ Cabernet Sauvignon", price: 18000000 },
  { category: "Món ăn", name: "FG. Flower 3/ Hoa yêu thương", price: 950000 },
  { category: "Đồ uống đóng chai", name: "Rượu sâm Tố nữ 19%", price: 1700000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU JOHNNIE WALKER DOUBLE BLACK", price: 220000 },
  { category: "Món ăn", name: "Xiên Nướng Tổng Hợp (07 Loại)", price: 549000 },
  { category: "Món ăn", name: "SET LUNCH 479++ ( Salad rau củ, Tôm kho, Cá thu chiên, Canh hẹ đậu hũ, Kem chanh )", price: 479000 },
  { category: "Món ăn", name: "Bò nướng vĩ", price: 0 },
  { category: "Đồ uống đóng chai", name: "SOFT DRINK MIX NƯỚC RED BULL / 250ML", price: 0 },
  { category: "Món ăn", name: "FG. Grilled salmon with mushroom sauce/Cá hồi nướng với sốt kem nấm", price: 640000 },
  { category: "Món ăn", name: "FG. Japanese- style frieds dumplings/Bánh xếp chiên kiểu nhật", price: 110000 },
  { category: "Món ăn", name: "SET MENU Đặc biệt 1000++", price: 1000000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU GLENFIDDICH 15", price: 3900000 },
  { category: "Món ăn", name: "Bông thiên lý xào bò", price: 379000 },
  { category: "Món ăn", name: "Trứng Cá Hồi/ Salmon Roe Sashimi", price: 299000 },
  { category: "Món ăn", name: "Grilled lamb chops / Sườn cừu nướng", price: 249000 },
  { category: "Món ăn", name: "FG. Japanese wagyu beef burger served with salad/Burger bò wagyu nhật và salad", price: 520000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU THE GLENLIVET 15", price: 4100000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU THE GLENLIVET 12", price: 280000 },
  { category: "Món ăn", name: "FG. Grilled Yellowtail Collar/Mang cá cam nướng", price: 230000 },
  { category: "Món ăn", name: "FG. Seafood tempura/Tempura hải sản", price: 250000 },
  { category: "Món ăn", name: "KEM TRÀ XANH NHẬT", price: 50000 },
  { category: "Món ăn", name: "Bánh Phồng", price: 49000 },
  { category: "Món ăn", name: "Cơm Cuộn Cua Lột Chiên Tempura, Dưa Leo, Trứng Cá Chuồn", price: 279000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU KRAKEN", price: 220000 },
  { category: "Món ăn", name: "Salad Bò Sốt Saikyo", price: 279000 },
  { category: "Món ăn", name: "Cá Thu Nhật Nướng Muối", price: 179000 },
  { category: "Món ăn", name: "Râu mực chiên sốt Dashi", price: 0 },
  { category: "Món ăn", name: "FG. Combo 5 kinds skewers/Xiên tổng hợp 5 loại", price: 330000 },
  { category: "Món ăn", name: "BUFFET Không Giới Hạn", price: 1050000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU ROKU", price: 2200000 },
  { category: "Món ăn", name: "Lõi vai bò Mỹ -Khoai tây nghiền-sốt tiêu đen", price: 0 },
  { category: "Đồ uống đóng chai", name: "Rượu sâm G-Tiso 19%", price: 1800000 },
  { category: "Món ăn", name: "VIB_Phile cá mú nướng sốt me cay dùng với trái oliu, cà chua, măng vàng, bông cải baby, lạp xưởng", price: 352734 },
  { category: "Món ăn", name: "Món Khai Vị Theo Mùa (Rong biển cay lạnh, bạch tuộc sốt wasabi, sò điệp cay)", price: 279000 },
  { category: "Món ăn", name: "FG. Grilled Stingray fins/Vây cá đuối nướng", price: 150000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU MACALLAN 18 DOUBLE CASK", price: 1800000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU CHAMPAGNE J.M. Labruyere, Prologue, Grand Cru,France", price: 3500000 },
  { category: "Món ăn", name: "FG. RAU THÊM", price: 100000 },
  { category: "Món ăn", name: "Hàu Chiên với 2 Loại Xốt: Mayo / Tonkatsu", price: 199000 },
  { category: "Món ăn", name: "Trứng cuộn / rolled omelet", price: 49000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU Pauillac De Chateau Latour, Bordeaux Blend", price: 6200000 },
  { category: "Món ăn", name: "Món Crispy Anchovies - Britcharm", price: 47619 },
  { category: "Món ăn", name: "Món Cajun Fried Chiken & Fries - Britcharm", price: 160494 },
  { category: "Món ăn", name: "FG. Grilled Japanese wagyu with BBQ sauce/Bò wagyu nhật áp chảo sốt BBQ", price: 850000 },
  { category: "Món ăn", name: "FG. Fried chicken cartilage/Sụn gà chiên giòn", price: 110000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU Castello Banfi, Brunello di Montalcino DOCG, Sangiovese,Italy", price: 3800000 },
  { category: "Đồ uống đóng chai", name: "Rượu sâm Thiên thần 19% ( Glass )", price: 150000 },
  { category: "Món ăn", name: "Hàu Hyogo Nướng Sốt Mentaiko (2 con)", price: 199000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU HIBIKI HARMONY", price: 5200000 },
  { category: "Món ăn", name: "SET.Gà chiên cajun", price: 0 },
  { category: "Đồ uống đóng chai", name: "RƯỢU BOWMORE 15", price: 460000 },
  { category: "Món ăn", name: "FG. Big plater - season of fruits/Trái cây theo mùa lớn", price: 600000 },
  { category: "Món ăn", name: "Hạt thông", price: 120000 },
  { category: "Món ăn", name: "FG. Grilled salmon breast with salt/Lườn cá hồi nướng muối", price: 320000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU BALVENIE 14", price: 680000 },
  { category: "Món ăn", name: "FG. Grilled scallops with cheese/Sò điệp nướng phô mai (5con)", price: 317000 },
  { category: "Đồ uống đóng chai", name: "SOFT DRINK MIX NƯỚC TONIC / 320ML", price: 0 },
  { category: "Đồ uống đóng chai", name: "RƯỢU D' Arenberg, The Olive Grove, Chardonnay", price: 1300000 },
  { category: "Món ăn", name: "Trứng Hấp Cua, Sốt Nấm Truffle và Trứng Cá Hồi", price: 249000 },
  { category: "Món ăn", name: "Món Crispy chiken cartilage - Britcharm", price: 88183 },
  { category: "Món ăn", name: "SET MENU 1250 ( Đậu hũ giấm hành, Nọng heo nướng, Cá răng nam cực, đậu rồng xào bò, Cơm chiên tỏi, Trái cây )", price: 1250000 },
  { category: "Món ăn", name: "VIB_Mỳ Udon kimchi bò Wagyu/ Wagyu A4 and kimchi noodle soup", price: 352734 },
  { category: "Món ăn", name: "Cá Hồi/Salmon Sushi", price: 119000 },
  { category: "Món ăn", name: "Bò Wagyu A4 Nướng, Xốt Tiêu -Nấm Truffle", price: 1279000 },
  { category: "Món ăn", name: "FG. Shrimp with Thai sauce/Tôm sú biển sốt thái", price: 230000 },
  { category: "Món ăn", name: "Hạt điều / Cashew Nuts", price: 110000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU HENDRICK'S", price: 210000 },
  { category: "Món ăn", name: "Mì Udon Bò & Nấm", price: 349000 },
  { category: "Món ăn", name: "Đậu bắp luộc ( Lớn )", price: 149000 },
  { category: "Món ăn", name: "Trứng hấp hải sản", price: 0 },
  { category: "Món ăn", name: "Cajun Fried Chicken / Gà chiên Cajun", price: 139000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU Guigal, Cotes du Rhone, Rhone Blend", price: 1400000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU Chateau Larcis Ducasse, St. Emilion 1st Grand Cru Classe, Bordeaux Blend", price: 5700000 },
  { category: "Combo", name: "SET LUNCH MENU 450", price: 396826 },
  { category: "Món ăn", name: "Squid tempura / Mực lăn bột chiên", price: 149000 },
  { category: "Món ăn", name: "Grilled black cod with Marinated sauce / Cá tuyết đen nướng với sốt Marinated", price: 279000 },
  { category: "Món ăn", name: "Cá Tuyết Áp Chảo, Xốt Bơ Tỏi Nấm Trufle", price: 679000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU BOWMORE 12", price: 250000 },
  { category: "Món ăn", name: "Hạt Ginkgo Nuts - Britcharm", price: 47619 },
  { category: "Món ăn", name: "Fried Vegetable / Rau củ thập cẩm chiên", price: 109000 },
  { category: "Món ăn", name: "Khô Cá Bống", price: 149000 },
  { category: "Đồ uống đóng chai", name: "BIA TIGER / 330ML", price: 75000 },
  { category: "Món ăn", name: "test", price: 202822 },
  { category: "Món ăn", name: "Teriyaki Sauce Beef Grilled / Bò nướng sốt teriyaki", price: 159000 },
  { category: "Món ăn", name: "SET MENU ĐẶC BIỆT", price: 1500000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU THE GLENLIVET 15", price: 380000 },
  { category: "Món ăn", name: "Sashimi 3 loại", price: 0 },
  { category: "Món ăn", name: "FG. Assorted Steamed Vegetables/Rau củ hấp", price: 85000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU THE GLENLIVET 12", price: 2900000 },
  { category: "Món ăn", name: "FG. Croissant with creamy crab/Bánh sừng bò sốt kem cua", price: 680000 },
  { category: "Món ăn", name: "FG. Bacon salad with poached egg/Salad thịt xông khối trứng lòng đào", price: 220000 },
  { category: "Đồ uống pha chế", name: "RƯỢU FASHIONED UMESHU", price: 1200000 },
  { category: "Món ăn", name: "FG. Japanese wagyu beef grilled with Hoba leaves/Bò Wagyu nhật nướng lá Hoba", price: 480000 },
  { category: "Món ăn", name: "FG. Bánh Mì Nướng", price: 72000 },
  { category: "Đồ uống đóng chai", name: "NƯỚC EVIAN / 750ML", price: 130000 },
  { category: "Món ăn", name: "FG. Thiên Nam Combo 9", price: 1450000 },
  { category: "Món ăn", name: "FG. Combo vegetable skewers/Xiên rau củ thập cẩm", price: 110000 },
  { category: "Đồ uống pha chế", name: "RƯỢU FASHIONED UMESHU BO", price: 500000 },
  { category: "Món ăn", name: "BO. Edamame Beans/Đậu nành nhật lắc muối", price: 0 },
  { category: "Đồ uống đóng chai", name: "RƯỢU CHIVAS ROYAL SALUTE 21", price: 680000 },
  { category: "Món ăn", name: "Salad Trái Cây Tươi, Xốt Hành Tây", price: 249000 },
  { category: "Món ăn", name: "Fried oyster / Hàu Nhật chiên", price: 179000 },
  { category: "Món ăn", name: "FG. Mixed 5 kinds sushi/Sushi 5 loại tổng hợp", price: 525000 },
  { category: "Món ăn", name: "FG. Xà Lách Bò Áp Chảo", price: 180000 },
  { category: "Món ăn", name: "Hàu Sống, Xốt Ponzu Nhật", price: 179000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU CHIVAS MINUZARA 18", price: 490000 },
  { category: "Món ăn", name: "FG. FUGU Seafood Platter/Đảo hải sản cao cấp FUGU", price: 2499000 },
  { category: "Món ăn", name: "Khô Cá Dứa / Dried Pangasius", price: 179000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU HAKU", price: 2000000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU Chateau Saint Andre, Montagne Saint Emilion, Merlot/ Cab Sauvignon", price: 1900000 },
  { category: "Món ăn", name: "Vịt nấu mì Ramen", price: 0 },
  { category: "Đồ uống đóng chai", name: "RƯỢU BALLANTINE 17", price: 350000 },
  { category: "Món ăn", name: "CB8_SET 1: SASHIMI ĐB + SALAD RONG BIỂN", price: 2000000 },
  { category: "Món ăn", name: "Chả Ram Tôm Đất 2", price: 249000 },
  { category: "Món ăn", name: "Ba Chỉ Cuộn Măng Tây / Bacon-Wrapped Asparagus", price: 79000 },
  { category: "Món ăn", name: "Checkin. Grilled Stingray fins/Vây cá đuối nướng", price: 0 },
  { category: "Món ăn", name: "KEM YUZU NHẬT", price: 50000 },
  { category: "Món ăn", name: "FUGU. SET LUNCH( ĐẶC BIỆT)", price: 1000000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU CHIVAS MINUZARA 18", price: 3900000 },
  { category: "Món ăn", name: "Cá Cam Chỉ Vàng/ Great Amberjack Sushi", price: 179000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU Comtes De CHAMPAGNE Grands Crus - Blanc de blanc", price: 12500000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU SINGLETON 15", price: 3900000 },
  { category: "Món ăn", name: "BO. Salt-Roasted Ginkgo Nuts/Bạch quả rang muối", price: 0 },
  { category: "Đồ uống đóng chai", name: "Rượu sâm HK 19%", price: 1200000 },
  { category: "Món ăn", name: "Bắp nướng", price: 149000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU Roux Pere, Fils Meursault", price: 6700000 },
  { category: "Món ăn", name: "SET MENU 1500++( Salad bỏ, Tủy bò nướng, Cua lột rang xốt trứng muối, Vịt khìa nước dừa, Trái cây )", price: 1500000 },
  { category: "Món ăn", name: "Checkin. Edamame Beans/Đậu nành nhật lắc muối", price: 0 },
  { category: "Đồ uống đóng chai", name: "RƯỢU GREY GOOSE", price: 250000 },
  { category: "Món ăn", name: "Trứng Hấp Lươn, Trứng Cá Hồi", price: 219000 },
  { category: "Món ăn", name: "Miến Xào Cua", price: 350000 },
  { category: "Món ăn", name: "SET MENU 1950++ ( Đậu phộng, Khô cá chỉ vàng, Râu mực, Gỏi ốc, Dê hấp tía tô, Nọng heo nướng, lẩu cá láng, Chè đậu đỏ )", price: 1950000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU BALVENIE 14", price: 6200000 },
  { category: "Món ăn", name: "FG. Wagyu katsu sando/Sandwich bò wagyu và caviar", price: 550000 },
  { category: "Đồ uống pha chế", name: "RƯỢU COSMOPOLITAN", price: 225000 },
  { category: "Món ăn", name: "SET FUGU. Mushroom clams soup/Súp nghêu hấp nấm", price: 0 },
  { category: "Món ăn", name: "Set Canape đặc biệt", price: 700000 },
  { category: "Đồ uống pha chế", name: "Rượu Fugu Sangria 2026", price: 99000 },
  { category: "Đồ uống pha chế", name: "RƯỢU WATERMELON  SMOKE", price: 255000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU JOHNNIE WALKER DOUBLE BLACK", price: 2200000 },
  { category: "Món ăn", name: "Khô mực / Dried Squid", price: 250000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU DON JULIO 1942", price: 10000000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU CHAMPAGNE Taittinger, Brut Prestige Rose, France", price: 4800000 },
  { category: "Món ăn", name: "Súp Miso Cá Hồi Rau Củ", price: 79000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU Maison Castel, Merlot, Bordeaux", price: 900000 },
  { category: "Món ăn", name: "V.Mushroom Fugu Soup (Súp Cá Nóc với Nấm)", price: 0 },
  { category: "Món ăn", name: "FG. Grilled scallops with cheese/Sò điệp nướng phô mai", price: 190000 },
  { category: "Món ăn", name: "FG. Yellowtail cappachio/Cá cam cappachio", price: 290000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU Vidal Estate by Villa Maria, Sauvignon Blanc, Malborough Valley", price: 200000 },
  { category: "Món ăn", name: "FG. Sukiyako hot-pot/Lẩu sukiyaki", price: 890000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU MACALLAN 12 SHERRY CASK", price: 5200000 },
  { category: "Đồ uống đóng chai", name: "BIA CORONA / 355ML", price: 115000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU SAKE Kubota Junmai Daiginjo 15% 300ml", price: 600000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU MARTELL CORDON BLEU", price: 7200000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU THE HAKUSHU DISTILLERS RESERVE", price: 720000 },
  { category: "Combo", name: "FUGU.SET THANH XUÂN 2", price: 1000000 },
  { category: "Đồ uống pha chế", name: "RƯỢU PANDAN JAPANESE BO", price: 500000 },
  { category: "Món ăn", name: "FG. FUGU's special sashimi/Sashimi FUGU đặc biêt", price: 1800000 },
  { category: "Món ăn", name: "Grilled Mackerel With Teriyaki Sauce / Cá Saba Nhật nướng sốt Teriyaki", price: 149000 },
  { category: "Món ăn", name: "Kem Hoa Anh Đào Nhật", price: 119000 },
  { category: "Món ăn", name: "KEM SOCOLA", price: 50000 },
  { category: "Món ăn", name: "Món Assorted Grilled 7 Skewers- Britcharm", price: 313051 },
  { category: "Món ăn", name: "Soup Bào Ngư", price: 249000 },
  { category: "Món ăn", name: "FG. Grilled black cod with Marinated sauce/Cá tuyết đen nướng với sốt Marinated", price: 320000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU BOWMORE 18", price: 7500000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU Opus One 2019, Cabernet Sauvignon", price: 20000000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU BALLANTINE 30", price: 11000000 },
  { category: "Món ăn", name: "Chả Ram Tôm Đất Lớn", price: 358000 },
  { category: "Món ăn", name: "FG. Mixed 3 kinds sushi/Sushi 3 loại tổng hợp", price: 249000 },
  { category: "Món ăn", name: "FG. Yellowtail with jalapeno peppers/Cá cam ăn kèm ớt jalapeno", price: 420000 },
  { category: "Món ăn", name: "Cơm Cuộn Lươn Nhật Nướng, ,Phô Mai", price: 349000 },
  { category: "Món ăn", name: "CB8_SET 4: MÌ RAMEN + CUA LỘT + RAU CỦ TEM", price: 1250000 },
  { category: "Món ăn", name: "SET LUNCH 549++ ( Trứng cuộn, tôm rim, Rau Lang Xào, Canh Cải Chả Cá, Khô Cá Dứa, Trái Cây )", price: 549000 },
  { category: "Món ăn", name: "V.Miso Duck Breast with Wine Poached Pear (Ức Vịt Nướng Miso kèm Lê Nấu Rượu)", price: 0 },
  { category: "Món ăn", name: "FG. Sashimi Amaebi/Sashimi tôm ngọt", price: 380000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU Chateau Mont Redon, Chateauneuf du Pape, Grenache / Syrah/ Mourvedre", price: 2900000 },
  { category: "Món ăn", name: "Grilled Salted Ayu Fish / Cá Ayu nướng muối", price: 249000 },
  { category: "Món ăn", name: "V.Rose Salmon with Yuzu Ponzu Sauce (Cá Hồi Hoa Hồng sốt Yuzu Ponzu)", price: 0 },
  { category: "Món ăn", name: "Cá Cam Chỉ Vàng, Xốt Carpaccio", price: 299000 },
  { category: "Món ăn", name: "Grilled Salted Yellowtail Fish Gills / Mang cá cam nướng muối", price: 179000 },
  { category: "Món ăn", name: "Lươn Nhật Nướng Than sốt Lươn", price: 379000 },
  { category: "Món ăn", name: "Assorted grilled vegetable skewers / Rau củ nướng thập cẩm", price: 109000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU SINGLETON 12", price: 2500000 },
  { category: "Món ăn", name: "Đậu Hũ Chiên Mắm Hành", price: 179000 },
  { category: "Món ăn", name: "Seafoods Tempura / Tempura Hải Sản", price: 239000 },
  { category: "Món ăn", name: "Grilled Kisu with salt / Cá bống đục nướng", price: 149000 },
  { category: "Món ăn", name: "FG. Sashimi Japanese Scallops/Sashimi sò điệp Nhật", price: 230000 },
  { category: "Món ăn", name: "CB8_SET 3: XIÊN 7 + XIÊN RAU CỦ + SALAD CÀNG CUA", price: 1250000 },
  { category: "Món ăn", name: "Nấm Đùi Gà Nướng, Xốt Teri Cay", price: 79000 },
  { category: "Đồ uống đóng chai", name: "NƯỚC COKE / 320ML", price: 60000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU SINGLETON 15", price: 460000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU Louis Jadot, Pouilly Fuisse, Chardonnay", price: 2800000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU MAKER'S MARK", price: 250000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU LAPHROAIG 10", price: 340000 },
  { category: "Món ăn", name: "Chả Ram Tôm Đất", price: 179000 },
  { category: "Món ăn", name: "WD.SÚP MISO NGHÊU NẤM", price: 0 },
  { category: "Món ăn", name: "VIB_Sườn bò canada nướng tiêu tứ xuyên ăn kèm cơm nhật chiên bơ tỏi", price: 352734 },
  { category: "Món ăn", name: "SET. Cajun frieds chitken/Gà chiên cajun & khoai tây", price: 0 },
  { category: "Món ăn", name: "Tép Chiên Giòn (Koebi Karaage)", price: 99000 },
  { category: "Món ăn", name: "Khổ Qua Chà Bông", price: 149000 },
  { category: "Mặt hàng khác", name: "Bánh sinh nhật", price: 0 },
  { category: "Đồ uống pha chế", name: "BIA TIGER DRAFT / GLASS ( 330ML )", price: 85000 },
  { category: "Món ăn", name: "SET MENU ĐẶC BIỆT 3000++", price: 3000000 },
  { category: "Món ăn", name: "Soup Miso Sò Điệp", price: 279000 },
  { category: "Món ăn", name: "Blue Fin Fatty Tuna/ Bụng Cá Ngừ Sushi", price: 449000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU Henri Bourgeois, 'En Travertin', Pouilly Fume, Sauvignon Blanc", price: 1700000 },
  { category: "Món ăn", name: "KEM XOÀI", price: 50000 },
  { category: "Món ăn", name: "FG. RONG BIỂN THÊM", price: 70000 },
  { category: "Món ăn", name: "FG. Ice-cream/Kem tự chọn", price: 100000 },
  { category: "Món ăn", name: "Bánh Kem Mochi", price: 99000 },
  { category: "Đồ uống đóng chai", name: "Lavie Sparkling 450ml", price: 80000 },
  { category: "Món ăn", name: "SET. Iberico pork fried rice/Cơm chiên thịt heo Iberico", price: 0 },
  { category: "Món ăn", name: "Gói Phụ Phí", price: 5000000 },
  { category: "Món ăn", name: "SET.FG. Fried shrimp balls with spicy miso sauce/Tôm viên chiên với sốt miso cay", price: 0 },
  { category: "Đồ uống đóng chai", name: "RƯỢU Domaine Huet, Clos du Bourg \"Demi Sec\", Chenin Blanc", price: 3800000 },
  { category: "Món ăn", name: "Grilled beef Roll with Enoki Mushroom / Bò cuộn nấm kim châm nướng", price: 159000 },
  { category: "Món ăn", name: "SET MENU 1500++ ( Đậu nành, đậu phộng, chả giò, Salad Rau Củ, Hến Xúc, Cua Hoàng Kim, Sườn Bò, cơm chiên tỏi, Kem yuzu )", price: 1500000 },
  { category: "Món ăn", name: "FG. Sashimi Canada Oysters/Sashimi Hàu canada", price: 420000 },
  { category: "Món ăn", name: "Khoai Tây Chiên/French Fries", price: 79000 },
  { category: "Món ăn", name: "WD.BÒ ANGUS NƯỚNG SỐT TIÊU ĐEN", price: 0 },
  { category: "Đồ uống đóng chai", name: "RƯỢU Chateau Prieure Lichine, Margaux 4th Grand Cru Classe, Bordeaux Blend", price: 4100000 },
  { category: "Món ăn", name: "FG. Seafood hot-pot/Lẩu hải sản", price: 690000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU Clay Creek Chardonnay", price: 1200000 },
  { category: "Món ăn", name: "FG. Japanese eel rice/Cơm lươn nhật", price: 280000 },
  { category: "Đồ uống pha chế", name: "HOT TEA POT", price: 130000 },
  { category: "Món ăn", name: "Herring Sushisushi /  Cá trích ép trứng", price: 79000 },
  { category: "Đồ uống đóng chai", name: "SOFT DRINK MIX -NƯỚC COKE / 320ML", price: 0 },
  { category: "Món ăn", name: "Cá Tráp Đỏ Sushi", price: 149000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU MACALLAN 15 DOUBLE CASK", price: 8000000 },
  { category: "Món ăn", name: "bồ câu quay", price: 249000 },
  { category: "Món ăn", name: "Cá Lăng Nướng", price: 279000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU HENNESSY VSOP", price: 2900000 },
  { category: "Món ăn", name: "Tôm hùm sống nha trang (Size L) / Sashimi nha trang live lobster", price: 3900000 },
  { category: "Món ăn", name: "Chả Cá Thác Lác", price: 249000 },
  { category: "Món ăn", name: "BO.Khoai tây chiên và sốt kem nấm", price: 0 },
  { category: "Món ăn", name: "Tôm Chiên Giòn/Koebi Karaage", price: 99000 },
  { category: "Món ăn", name: "KEM ĐÀO", price: 50000 },
  { category: "Món ăn", name: "FG.Đậu nành nhật/Japanese Soybeans", price: 59000 },
  { category: "Món ăn", name: "FG. Tuna Tatare/Cá ngừ tatare", price: 620000 },
  { category: "Món ăn", name: "Chả Giò", price: 279000 },
  { category: "Đồ uống đóng chai", name: "Rượu sâm Tố nữ 19% ( Glass )", price: 180000 },
  { category: "Món ăn", name: "Cá Cam Chỉ Vàng/ Kanpachi Sashimi", price: 219000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU BALLANTINE 17", price: 3200000 },
  { category: "Món ăn", name: "FG. Fried shrimp balls with spicy miso sauce/Tôm viên chiên với sốt miso cay", price: 190000 },
  { category: "Món ăn", name: "Đậu Bắp Luộc", price: 49000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU BULLEIT", price: 1900000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU KINGSTON 62 WHITE", price: 1200000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU SAKE Dassai 45 16% -300ml", price: 650000 },
  { category: "Món ăn", name: "FG. Mochi 3 viên", price: 149000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU KINOBI KYOTO", price: 3200000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU MACALLAN 18 DOUBLE CASK", price: 16000000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU THE YAMAZAKI DISTILLERS RESERVE", price: 6200000 },
  { category: "Mặt hàng khác", name: "Corkage charge", price: 1500000 },
  { category: "Món ăn", name: "SET MENU 1700++ ( Súp chân gà, Xương tủy bò, Vịt khìa nước dừa, Hến xúc bánh đa, Cá mú hấp)", price: 1700000 },
  { category: "Đồ uống pha chế", name: "BIA HEINEKEN DRAFT / GLASS ( 500ML )", price: 155000 },
  { category: "Món ăn", name: "Trứng Cầu Gai Sashimi", price: 1279000 },
  { category: "Đồ uống pha chế", name: "RƯỢU MARTINI", price: 250000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU CHIVAS ROYAL SALUTE 21", price: 5800000 },
  { category: "Đồ uống pha chế", name: "BIA HEINEKEN DRAFT / GLASS ( 330ML )", price: 85000 },
  { category: "Combo", name: "SET MENU 800++", price: 800000 },
  { category: "Món ăn", name: "FG. Grilled beef with enoki mushroom/Bò cuộn nấm kim châm nướng", price: 159000 },
  { category: "Món ăn", name: "Bạch Tuộc/ Octopus Sashimi", price: 179000 },
  { category: "Món ăn", name: "Cơm Cuộn Bò Wagyu A5, Măng Tây , Xốt Yakiniku", price: 479000 },
  { category: "Món ăn", name: "FG. Dưa leo", price: 90000 },
  { category: "Món ăn", name: "FG. Fried vegetables/Tempura rau củ thập cẩm", price: 109000 },
  { category: "Món ăn", name: "Trứng Cầu Gai/ Sea Urchin Sushi", price: 749000 },
  { category: "Món ăn", name: "SET.Salad rau củ", price: 0 },
  { category: "Đồ uống đóng chai", name: "Rượu sâm Premium 34% ( Glass )", price: 210000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU SINGLETON 12", price: 310000 },
  { category: "Món ăn", name: "Cơm Chiên Cá Hồi và Trứng Cá Hồi", price: 249000 },
  { category: "Món ăn", name: "FG. Seafood salad/Salad hải sản", price: 250000 },
  { category: "Món ăn", name: "SET MENU 1500++ ( Khai vị 3 món, Sashimi 4 loại, Tôm sú biển nướng, Cơm lươn, Soup miso, Kem 2 vị )", price: 1500000 },
  { category: "Món ăn", name: "KEM HẠNH NHÂN", price: 50000 },
  { category: "Món ăn", name: "FG. Iberico pork fried rice/Cơm chiên thịt heo Iberico", price: 250000 },
  { category: "Món ăn", name: "Grilled  sweet potato / Khoai lang nướng", price: 49000 },
  { category: "Món ăn", name: "Súp miso rong biển", price: 49000 },
  { category: "Món ăn", name: "Cơm Cuộn Cá Hồi, Phô Mai, Xoài, Bơ Trái", price: 279000 },
  { category: "Món ăn", name: "Sò lông nướng mỡ hành", price: 370000 },
  { category: "Món ăn", name: "BO. Grilled Stingray fins/Vây cá đuối nướng", price: 0 },
  { category: "Món ăn", name: "Cá Hồi Nướng Sốt Ume", price: 379000 },
  { category: "Món ăn", name: "SET MENU ĐẶC BIỆT", price: 360000 },
  { category: "Món ăn", name: "Sashimi Cá Tráp Đỏ Kèm Tảo Nori/ Madai Sashimi Carpaccio", price: 249000 },
  { category: "Món ăn", name: "Deep fried baby shimp / Tép đồng chiên giòn", price: 79000 },
  { category: "Món ăn", name: "Bò Black Angus MB4 Nướng, Xốt Tiêu Nấm Truffle", price: 799000 },
  { category: "Món ăn", name: "FG. Grilled oysters with chilli miso sauce/(5CON)Hàu nướng sốt miso ớt hiểm", price: 860000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU CHAMPAGNE G.H Mumm Grand Cordon", price: 2800000 },
  { category: "Món ăn", name: "Mang Cá Cam Nướng, Xốt Quýt Nhật Cay", price: 349000 },
  { category: "Món ăn", name: "SET MENU 2000++ (Chả ốc bươu, cua lông Phượng Hải, Trứng hấp nhung, Sườn bò mỹ, Cá thu áp chảo)", price: 2000000 },
  { category: "Món ăn", name: "FG. Tuna tartare trio/Sushi áp chảo cá ngừ tartare", price: 675000 },
  { category: "Món ăn", name: "Mề Vịt Xào Giá Hẹ", price: 179000 },
  { category: "Món ăn", name: "SET MENU 2200++ ( Chả giò , Nọng heo, Salad trứng, Tôm hùm, Cá thu áp chảo, Cơm chiên dừa, kem matcha)", price: 2200000 },
  { category: "Món ăn", name: "WD.SALAD LƯỜN NGỖNG XONG KHÓI", price: 0 },
  { category: "Món ăn", name: "FG. Kimchi/Kim chi", price: 49000 },
  { category: "Đồ uống đóng chai", name: "RƯỢU Chateau Rouget, Pomerol, Bordeaux Blend", price: 4500000 },
  { category: "Món ăn", name: "Cá tầm nướng muối ớt  - Rau rừng - dưa chua", price: 349000 },
  { category: "Món ăn", name: "Ốc bươu nhồi thịt", price: 79000 },
  { category: "Món ăn", name: "Tôm Ngọt/ Sweet Shrimp Sushi", price: 219000 },
  { category: "Món ăn", name: "FUGU.THANH XUÂN KEM YUZU NHẬT", price: 0 },
  { category: "Món ăn", name: "Đầu Cá Hồi Nướng, Xốt Teri", price: 249000 },
  { category: "Món ăn", name: "FG. Char xiu ramen/Mì ramen xá xíu", price: 179000 },
  { category: "Món ăn", name: "Hạt bí", price: 120000 },
  { category: "Món ăn", name: "Trái Cây Theo Mùa", price: 349000 },
];

export default function CancelReportPage() {
  const monthPickerRef = useRef<HTMLInputElement>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [availableItems, setAvailableItems] = useState<any[]>(initialCancelData);

  const [editId, setEditId] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<"UNPOSTED" | "POSTED">("UNPOSTED"); 
  const [cartItems, setCartItems] = useState<any[]>([]);

  const [itemSearch, setItemSearch] = useState("");
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("Món ăn");
  const [newItemPrice, setNewItemPrice] = useState("");

  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [bulkText, setBulkText] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res: any = await fetchData(`/cancel-reports?month=${selectedMonth}`);
      setLogs(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [selectedMonth]);

  const formatVND = (num: number) => Math.round(num).toLocaleString("vi-VN") + "đ";

  const sortedLogs = useMemo(() => {
    return [...logs].sort((a, b) => {
      const timeA = new Date(a.createdAt || a.date).getTime();
      const timeB = new Date(b.createdAt || b.date).getTime();
      return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
    });
  }, [logs, sortOrder]);

  const handleSelectItem = (item: any) => {
    const existing = cartItems.findIndex(i => i.name === item.name);
    if (existing >= 0) {
      const newItems = [...cartItems];
      newItems[existing].quantity += 1;
      const updatedItem = newItems.splice(existing, 1)[0];
      newItems.unshift(updatedItem);
      setCartItems(newItems);
    } else {
      setCartItems([{ category: item.category, name: item.name, price: item.price, quantity: 1 }, ...cartItems]);
    }
    setItemSearch("");
    setShowItemDropdown(false);
    setIsAddingNew(false);
  };

  const handleQtyChange = (index: number, delta: number) => {
    const newItems = [...cartItems];
    newItems[index].quantity += delta;
    if (newItems[index].quantity <= 0) {
      newItems.splice(index, 1);
    }
    setCartItems(newItems);
  };

  const handleCategoryChange = (index: number, newCategory: string) => {
    const newItems = [...cartItems];
    newItems[index].category = newCategory;
    setCartItems(newItems);
  };

  const resetForm = () => {
    setEditId(null);
    setDate(new Date().toISOString().split('T')[0]);
    setType("UNPOSTED");
    setCartItems([]);
    setItemSearch("");
    setIsAddingNew(false);
    setShowBulkPaste(false);
    setBulkText("");
  };

  const handleAddNewToCart = () => {
    if (!newItemName.trim()) return alert("Vui lòng nhập tên món mới!");
    const newItem = {
      category: newItemCategory,
      name: newItemName.trim(),
      price: Number(newItemPrice) || 0
    };
    setAvailableItems(prev => [newItem, ...prev]);
    handleSelectItem(newItem);
    setIsAddingNew(false);
    setNewItemName("");
    setNewItemPrice("");
  };

  // ==========================================
  // XỬ LÝ NHẬP NHANH (BULK PASTE) - ĐÃ CẬP NHẬT LOGIC GIÁ
  // ==========================================
  const handleBulkPaste = () => {
    if (!bulkText.trim()) return;

    const lines = bulkText.trim().split('\n');
    const newCartItems = [...cartItems];
    let successCount = 0;
    let failCount = 0;

    lines.forEach(line => {
      const parts = line.split('\t').map(p => p.trim());
      
      if (parts.length < 2) {
        const match = line.match(/^(.*?)\s+(\d+)$/);
        if (match) {
          parts[0] = match[1].trim();
          parts[1] = match[2].trim();
        } else {
          failCount++;
          return;
        }
      }

      const name = parts[0];
      const qty = parseInt(parts[1], 10);
      const priceStr = parts[2] ? parts[2].replace(/[^0-9]/g, '') : null;
      const price = priceStr ? parseInt(priceStr, 10) : null;

      if (!name || isNaN(qty) || qty <= 0) {
        failCount++;
        return;
      }

      // Tìm món trong danh sách gốc
      const existingItem = availableItems.find(i => i.name.toLowerCase() === name.toLowerCase());
      
      if (existingItem) {
        // NẾU CÓ TRUYỀN GIÁ TỪ EXCEL VÀ GIÁ KHÁC VỚI HỆ THỐNG -> COI NHƯ MÓN MỚI
        if (price !== null && price !== existingItem.price) {
          const newItem = {
            category: "Khác (Nhập nhanh)",
            name: name,
            price: price,
            quantity: qty
          };
          newCartItems.unshift(newItem);
          // Lưu lại vào danh sách tạm để lần sau tìm thấy
          setAvailableItems(prev => [{ category: "Khác (Nhập nhanh)", name, price }, ...prev]);
          successCount++;
        } else {
          // GIÁ KHỚP HOẶC KHÔNG TRUYỀN GIÁ -> GỘP VÀO MÓN CŨ
          const existingInCart = newCartItems.findIndex(i => i.name === existingItem.name);
          if (existingInCart >= 0) {
            newCartItems[existingInCart].quantity += qty;
          } else {
            newCartItems.unshift({
              category: existingItem.category,
              name: existingItem.name,
              price: existingItem.price,
              quantity: qty
            });
          }
          successCount++;
        }
      } else if (price !== null) {
        // MÓN HOÀN TOÀN MỚI (CHƯA TỪNG CÓ TRONG HỆ THỐNG)
        const newItem = {
          category: "Khác (Nhập nhanh)",
          name: name,
          price: price,
          quantity: qty
        };
        newCartItems.unshift(newItem);
        setAvailableItems(prev => [{ category: "Khác (Nhập nhanh)", name, price }, ...prev]);
        successCount++;
      } else {
        // KHÔNG TÌM THẤY VÀ KHÔNG CÓ GIÁ
        failCount++;
      }
    });

    setCartItems(newCartItems);
    setShowBulkPaste(false);
    setBulkText("");
    alert(`Đã xử lý xong:\n- Thành công: ${successCount} món\n- Thất bại: ${failCount} món (Không tìm thấy tên hoặc sai định dạng)`);
  };

  const handleSaveLog = async () => {
    if (cartItems.length === 0) return alert("Phiếu chưa có món nào!");
    const payload = { date, type, items: cartItems };
    try {
      if (editId) await updateData(`/cancel-reports/${editId}`, payload);
      else await postData("/cancel-reports", payload);
      resetForm();
      loadData();
      alert("✅ Đã lưu phiếu thành công!");
    } catch (e) { alert("❌ Lỗi khi lưu phiếu!"); }
  };

  const handleEditClick = (log: any) => {
    setEditId(log._id);
    setDate(log.date);
    setType(log.type);
    const mapped = log.items.map((i: any) => ({
      category: i.category, name: i.name, price: i.price, quantity: i.quantity
    }));
    setCartItems(mapped);
  };

  const handleDeleteLog = async (id: string) => {
    if (!window.confirm("Xóa phiếu ghi nhận này?")) return;
    try {
      await deleteData(`/cancel-reports/${id}`);
      loadData();
    } catch (error) { alert("Lỗi xóa phiếu!"); }
  };

  const handleDeleteMonth = async () => {
    if (!window.confirm(`NGUY HIỂM: Bạn có chắc muốn xóa TOÀN BỘ dữ liệu của tháng ${selectedMonth}?`)) return;
    try {
      await deleteData(`/cancel-reports/month/${selectedMonth}`);
      loadData();
      alert("Đã xóa toàn bộ lịch sử tháng!");
    } catch (error) { alert("Lỗi khi xóa tháng!"); }
  };

  const summaryData = useMemo(() => {
    const map: Record<string, any> = {};
    let totalLostValue = 0;

    logs.forEach(log => {
      log.items.forEach((item: any) => {
        if (!map[item.name]) {
          map[item.name] = { category: item.category, name: item.name, price: item.price, unpostedQty: 0, postedQty: 0 };
        }
        if (log.type === "UNPOSTED") {
          map[item.name].unpostedQty += item.quantity;
          totalLostValue += (item.quantity * item.price);
        } else if (log.type === "POSTED") {
          map[item.name].postedQty += item.quantity;
          totalLostValue -= (item.quantity * item.price);
        }
      });
    });

    const groups: Record<string, any[]> = {};
    Object.values(map).forEach(item => {
      if (item.unpostedQty > 0 || item.postedQty > 0) {
        if (!groups[item.category]) groups[item.category] = [];
        groups[item.category].push(item);
      }
    });

    return { groups, totalLostValue };
  }, [logs]);

  const filteredSuggestions = availableItems.filter(w => w.name.toLowerCase().includes(itemSearch.toLowerCase()));

  const calculateBillTotal = (items: any[]) => items.reduce((sum, it) => sum + (it.price * it.quantity), 0);
  const calculateBillQty = (items: any[]) => items.reduce((sum, it) => sum + it.quantity, 0);

  const handleExportExcel = () => {
    if (logs.length === 0) {
      alert("Không có dữ liệu để xuất trong tháng này!");
      return;
    }

    const historyData = sortedLogs.map((log, index) => {
      const itemsDetail = log.items.map((item: any) => 
        `${item.quantity}x ${item.name} (${formatVND(item.price)})`
      ).join("; ");
      
      return {
        "STT": index + 1,
        "Ngày": log.date,
        "Thời gian": log.createdAt ? new Date(log.createdAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : "",
        "Loại phiếu": log.type === "UNPOSTED" ? "HỦY MÓN" : "ĐÃ POST",
        "Chi tiết món": itemsDetail,
        "Số lượng món": calculateBillQty(log.items),
        "Thành tiền": calculateBillTotal(log.items),
      };
    });

    const summaryRows: any[] = [];
    Object.entries(summaryData.groups).forEach(([category, items]) => {
      items.forEach((item: any) => {
        summaryRows.push({
          "Danh mục": category,
          "Tên món": item.name,
          "Đơn giá": item.price,
          "Tổng hủy": item.unpostedQty,
          "Đã post": item.postedQty,
          "Chênh lệch (Hủy - Post)": item.unpostedQty - item.postedQty,
          "Giá trị chênh lệch": (item.unpostedQty - item.postedQty) * item.price,
        });
      });
    });

    const billData = sortedLogs.map((log, index) => {
      return {
        "STT": index + 1,
        "Ngày": log.date,
        "Thời gian": log.createdAt ? new Date(log.createdAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : "",
        "Loại phiếu": log.type === "UNPOSTED" ? "HỦY MÓN" : "ĐÃ POST",
        "Tổng số món": calculateBillQty(log.items),
        "Tổng thành tiền": calculateBillTotal(log.items),
      };
    });

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(historyData);
    XLSX.utils.book_append_sheet(wb, ws1, "Lịch sử nhập liệu");
    const ws2 = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, ws2, "Thống kê tổng hợp");
    const ws3 = XLSX.utils.json_to_sheet(billData);
    XLSX.utils.book_append_sheet(wb, ws3, "Chi tiết bill");

    const summarySheet = [
      { "Thông tin": "BÁO CÁO ĐỐI SOÁT HỦY/POST" },
      { "Thông tin": `Tháng: ${selectedMonth}` },
      { "Thông tin": "" },
      { "Thông tin": "TỔNG KẾT:" },
      { "Thông tin": `Tổng số phiếu: ${logs.length}` },
      { "Thông tin": `Tổng số phiếu HỦY: ${logs.filter(l => l.type === "UNPOSTED").length}` },
      { "Thông tin": `Tổng số phiếu ĐÃ POST: ${logs.filter(l => l.type === "POSTED").length}` },
      { "Thông tin": `Tổng giá trị hủy thực tế: ${formatVND(summaryData.totalLostValue)}` },
      { "Thông tin": "" },
      { "Thông tin": "Ngày xuất báo cáo:" },
      { "Thông tin": new Date().toLocaleString('vi-VN') },
    ];
    const ws4 = XLSX.utils.json_to_sheet(summarySheet);
    ws4['!cols'] = [{ wch: 40 }];
    XLSX.utils.book_append_sheet(wb, ws4, "Tóm tắt");

    const monthDisplay = selectedMonth.replace("-", "_");
    XLSX.writeFile(wb, `Bao_cao_huy_mon_${monthDisplay}.xlsx`);
  };

  return (
    <div className="h-full overflow-auto bg-slate-50 p-2 sm:p-6 text-sm font-sans">
      <div className="max-w-[1400px] mx-auto space-y-4 pb-10">
        
        {/* TOP HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-3 rounded-xl shadow-xs border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-100 text-rose-700 rounded-lg">
              <FileWarning className="w-5 h-5"/>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 leading-tight">Quản Lý Hủy Món</h1>
              <p className="text-[11px] text-slate-500 font-medium">Đối soát Số lượng Hủy và Số lượng Đã Post vào POS</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 mt-3 sm:mt-0">
            <div 
              onClick={() => monthPickerRef.current?.showPicker()}
              className="bg-slate-100 px-3 py-1.5 rounded-lg flex items-center gap-2 border border-slate-200 cursor-pointer hover:border-slate-300 hover:bg-slate-200/50 transition w-[160px] relative overflow-hidden"
            >
              <Calendar className="w-4 h-4 text-slate-500 pointer-events-none" />
              <span className="font-bold text-slate-600 text-xs uppercase tracking-wide pointer-events-none whitespace-nowrap">
                Tháng: <span className="text-rose-600">{selectedMonth ? `${selectedMonth.split("-")[1]}/${selectedMonth.split("-")[0]}` : ""}</span>
              </span>
              
              <input 
                ref={monthPickerRef}
                type="month" 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)} 
                className="absolute w-0 h-0 opacity-0 overflow-hidden pointer-events-none"
              />
            </div>
            <Button variant="outline" size="icon" onClick={loadData} className="h-9 w-9 text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors">
              <RefreshCcw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}/>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportExcel} 
              className="h-9 font-semibold border-emerald-500 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-600 shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5"/> Xuất Excel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteMonth} className="h-9 font-semibold shadow-sm">
              <Trash2 className="w-4 h-4 mr-1.5"/> Xóa Tháng Này
            </Button>
          </div>
        </div>

        <Tabs defaultValue="manage" className="w-full">
          <TabsList className="mb-4 h-10 bg-white border border-slate-200 shadow-xs w-full sm:w-auto p-1 rounded-lg">
            <TabsTrigger value="manage" className="text-sm px-6 rounded-md data-[state=active]:bg-rose-600 data-[state=active]:text-white transition-all font-medium">
              Ghi Nhận & Lịch Sử
            </TabsTrigger>
            <TabsTrigger value="summary" className="text-sm px-6 rounded-md data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all font-medium">
              Thống Kê Tổng Hợp
            </TabsTrigger>
            <TabsTrigger value="bills" className="text-sm px-6 rounded-md data-[state=active]:bg-emerald-600 data-[state=active]:text-white transition-all font-medium">
              Chi Tiết Các Bill
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manage" className="space-y-4 m-0">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* CỘT TRÁI: FORM NHẬP PHIẾU (TỐI ƯU POS) */}
              <div className="lg:col-span-5 xl:col-span-5 flex flex-col gap-4">
                <Card className={`shadow-md border-0 ring-1 h-full flex flex-col ${editId ? 'ring-amber-400 bg-amber-50/10' : 'ring-slate-200 bg-white'} transition-all`}>
                  <CardHeader className="py-3 px-4 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50/50 rounded-t-xl shrink-0">
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                      {editId ? <><Edit3 className="w-4 h-4 text-amber-600"/> SỬA PHIẾU GHI NHẬN</> : <><ClipboardList className="w-4 h-4 text-rose-600"/> TẠO PHIẾU MỚI</>}
                    </CardTitle>
                    {editId && (
                      <Button variant="ghost" size="sm" onClick={resetForm} className="h-7 px-2 text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50">
                        <XCircle className="w-3 h-3 mr-1"/> Hủy sửa
                      </Button>
                    )}
                  </CardHeader>
                  
                  <CardContent className="p-0 flex flex-col flex-1">
                    
                    <div className="p-4 space-y-4 shrink-0">
                      {/* THÔNG TIN PHIẾU */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ngày ghi nhận</label>
                          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-10 text-sm font-medium border-slate-300" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Loại phiếu</label>
                          <SelectUI value={type} onValueChange={(v: "UNPOSTED"|"POSTED") => setType(v)}>
                            <SelectTrigger className={`h-10 text-xs font-bold border-0 ring-1 ${type === "UNPOSTED" ? 'bg-rose-50 ring-rose-300 text-rose-700' : 'bg-emerald-50 ring-emerald-300 text-emerald-700'}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="UNPOSTED" className="font-bold text-rose-600">🔴 Ghi Nhận HỦY MÓN</SelectItem>
                              <SelectItem value="POSTED" className="font-bold text-emerald-600">🟢 Ghi Nhận ĐÃ POST</SelectItem>
                            </SelectContent>
                          </SelectUI>
                        </div>
                      </div>

                      {/* TÌM KIẾM HOẶC TẠO MỚI MÓN */}
                      <div className={`p-4 rounded-xl border space-y-3 relative ${type === "UNPOSTED" ? "bg-rose-50/50 border-rose-100" : "bg-emerald-50/50 border-emerald-100"}`}>
                        <div className="flex justify-between items-center mb-1">
                          <label className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${type === "UNPOSTED" ? "text-rose-700" : "text-emerald-700"}`}>
                            <Search className="w-3.5 h-3.5"/> Chọn món / Thức uống
                          </label>
                          
                          <button 
                            type="button"
                            onClick={() => setShowBulkPaste(!showBulkPaste)} 
                            className="text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors flex items-center gap-1 shadow-sm border border-blue-200"
                          >
                            <ClipboardPaste className="w-3 h-3" /> Dán danh sách (Excel)
                          </button>
                        </div>
                        
                        <div className="flex gap-2 items-center">
                          <div className="relative flex-1 shadow-sm rounded-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input 
                              placeholder="Gõ tên món (Bấm để chọn)..." 
                              value={itemSearch} 
                              onFocus={() => setShowItemDropdown(true)} 
                              onBlur={() => setTimeout(() => setShowItemDropdown(false), 200)} 
                              onChange={e => setItemSearch(e.target.value)} 
                              className="h-11 pl-9 text-sm font-medium border-slate-300 bg-white" 
                            />
                            
                            {showItemDropdown && itemSearch && (
                              <div className="absolute z-50 w-full bg-white border border-slate-200 rounded-lg shadow-xl mt-1 max-h-60 overflow-y-auto divide-y divide-slate-100">
                                {filteredSuggestions.map((w, i) => (
                                    <div key={i} onMouseDown={(e) => { e.preventDefault(); handleSelectItem(w); }} className="p-3 hover:bg-slate-50 cursor-pointer flex justify-between items-center group">
                                      <div>
                                        <span className="font-semibold text-slate-700 group-hover:text-blue-600 text-sm block leading-tight">{w.name}</span>
                                        <span className="text-[10px] text-slate-400">{w.category}</span>
                                      </div>
                                      <Badge variant="secondary" className="bg-slate-100 text-slate-600 border border-slate-200">{formatVND(w.price)}</Badge>
                                    </div>
                                ))}
                                {filteredSuggestions.length === 0 && (
                                  <div className="p-4 text-sm text-slate-500 text-center bg-slate-50">
                                    Không tìm thấy món.<br/>
                                    <span className="text-xs text-slate-400 mt-1 block">Vui lòng bấm "Tạo món mới" bên cạnh.</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <Button 
                            type="button"
                            onClick={() => { 
                              setIsAddingNew(!isAddingNew); 
                              if (!isAddingNew && itemSearch) setNewItemName(itemSearch); 
                            }} 
                            variant={isAddingNew ? "secondary" : "default"}
                            className={`h-11 px-4 whitespace-nowrap font-bold shadow-sm ${!isAddingNew && "bg-blue-600 hover:bg-blue-700 text-white"}`}
                          >
                            {isAddingNew ? <XCircle className="w-4 h-4 mr-1.5"/> : <PlusCircle className="w-4 h-4 mr-1.5"/>}
                            {isAddingNew ? "Hủy tạo" : "Tạo món mới"}
                          </Button>
                        </div>

                        {showBulkPaste && (
                          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex flex-col gap-3 shadow-inner transition-all animate-in slide-in-from-top-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <label className="text-xs font-bold text-blue-800 uppercase block">Dán dữ liệu từ Excel</label>
                                <p className="text-[10px] text-blue-600 mt-1 leading-relaxed">
                                  Bôi đen và Copy 3 cột: <b>[Tên món]</b>, <b>[Số lượng]</b>, và <b>[Giá tiền]</b> (cách nhau bằng Tab).<br/>
                                  <i>* Nếu món đã có sẵn trong hệ thống, chỉ cần Copy 2 cột (Tên & SL).<br/>
                                  * Nếu giá tiền khác với hệ thống, hệ thống sẽ tự tạo thành món mới.</i>
                                </p>
                              </div>
                              <button onClick={() => setShowBulkPaste(false)} className="text-slate-400 hover:text-red-500">
                                <XCircle className="w-5 h-5"/>
                              </button>
                            </div>
                            <textarea
                              value={bulkText}
                              onChange={(e) => setBulkText(e.target.value)}
                              placeholder="RƯỢU MAKER'S MARK    2    2000000&#10;NƯỚC COKE / 320ML    5&#10;Món mới tinh    1    150000"
                              className="w-full h-32 p-2 text-xs font-mono border border-blue-300 rounded resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                            />
                            <Button onClick={handleBulkPaste} className="h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold w-full shadow-sm">
                              Xử lý & Thêm vào phiếu
                            </Button>
                          </div>
                        )}

                        {isAddingNew && (
                          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex flex-col gap-3 shadow-inner transition-all animate-in slide-in-from-top-2">
                            <div className="flex-1 w-full space-y-1.5">
                              <label className="text-xs font-bold text-blue-800 uppercase">Tên món mới</label>
                              <Input value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="VD: Nước suối..." className="h-10 bg-white border-blue-300" />
                            </div>
                            <div className="flex gap-3 w-full">
                              <div className="flex-1 space-y-1.5">
                                <label className="text-xs font-bold text-blue-800 uppercase">Danh mục</label>
                                <SelectUI value={newItemCategory} onValueChange={setNewItemCategory}>
                                  <SelectTrigger className="h-10 bg-white border-blue-300"><SelectValue/></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Món ăn">Món ăn</SelectItem>
                                    <SelectItem value="Đồ uống pha chế">Đồ uống pha chế</SelectItem>
                                    <SelectItem value="Đồ uống đóng chai">Đồ uống đóng chai</SelectItem>
                                    <SelectItem value="Khác">Khác</SelectItem>
                                  </SelectContent>
                                </SelectUI>
                              </div>
                              <div className="flex-1 space-y-1.5">
                                <label className="text-xs font-bold text-blue-800 uppercase">Giá (VNĐ)</label>
                                <Input type="number" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} placeholder="0" className="h-10 bg-white border-blue-300 text-center font-bold text-blue-700" />
                              </div>
                            </div>
                            <Button onClick={handleAddNewToCart} className="h-10 mt-1 bg-emerald-600 hover:bg-emerald-700 w-full shadow-sm text-sm">
                              + Thêm vào phiếu
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* KHU VỰC CART */}
                    <div className="flex flex-col bg-slate-50 border-t border-slate-200">
                      <div className="bg-slate-200/50 px-4 py-2.5 text-xs font-bold text-slate-600 border-b border-slate-200 uppercase tracking-widest shrink-0">
                        Chi tiết món trong phiếu
                      </div>
                      
                      <div className="p-3 space-y-2 overflow-y-auto max-h-[500px]">
                        {cartItems.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-slate-400 py-10 gap-2">
                            <ClipboardList className="w-10 h-10 opacity-30"/>
                            <p className="text-sm font-medium mt-2">Phiếu chưa có món nào</p>
                          </div>
                        ) : (
                          cartItems.map((item, idx) => (
                            <div key={idx} className="flex flex-col bg-white p-3 rounded-xl shadow-sm border border-slate-200 group">
                              <div className="flex justify-between items-start gap-2">
                                <div className="flex-1">
                                  <span className="font-bold text-slate-800 text-sm block leading-snug">{item.name}</span>
                                  
                                  <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
                                    <SelectUI 
                                      value={item.category} 
                                      onValueChange={(val) => handleCategoryChange(idx, val)}
                                    >
                                      <SelectTrigger className="h-6 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 border-slate-200 px-2 py-0 rounded shadow-sm w-auto min-w-[90px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Món ăn" className="text-[11px] font-bold">Món ăn</SelectItem>
                                        <SelectItem value="Đồ uống đóng chai" className="text-[11px] font-bold">Đồ uống đóng chai</SelectItem>
                                        <SelectItem value="Đồ uống pha chế" className="text-[11px] font-bold">Đồ uống pha chế</SelectItem>
                                        <SelectItem value="Khác (Nhập nhanh)" className="text-[11px] font-bold">Khác</SelectItem>
                                      </SelectContent>
                                    </SelectUI>
                                    <span className="text-[11px]">{formatVND(item.price)}/món</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="font-black text-rose-600 text-sm block mt-1">
                                    {formatVND(item.price * item.quantity)}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex justify-end items-center mt-3 pt-2 border-t border-slate-100">
                                <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200 shadow-inner">
                                  <button onClick={() => handleQtyChange(idx, -1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm text-slate-600 hover:bg-slate-200 transition-colors">
                                    <Minus className="w-4 h-4"/>
                                  </button>
                                  <input
                                    type="number"
                                    min={1}
                                    value={item.quantity}
                                    onChange={(e) => {
                                      const value = Number(e.target.value);
                                      const newItems = [...cartItems];
                                      newItems[idx].quantity = value > 0 ? value : 1;
                                      setCartItems(newItems);
                                    }}
                                    className="w-14 h-8 text-center text-sm font-black bg-transparent outline-none"
                                  />
                                  <button onClick={() => handleQtyChange(idx, 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm text-slate-600 hover:bg-slate-200 transition-colors">
                                    <Plus className="w-4 h-4"/>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* STICKY FOOTER CHO CART */}
                      <div className="bg-white border-t border-slate-200 p-4 shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-sm font-bold text-slate-600 uppercase">Tổng cộng ({calculateBillQty(cartItems)} món)</span>
                          <span className="text-xl font-black text-rose-600">{formatVND(calculateBillTotal(cartItems))}</span>
                        </div>
                        <Button 
                          onClick={handleSaveLog} 
                          className={`w-full h-12 font-black text-sm uppercase tracking-widest shadow-md transition-all rounded-xl ${type === "UNPOSTED" ? "bg-rose-600 hover:bg-rose-700 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white"}`}
                        >
                          <Save className="w-5 h-5 mr-2"/> 
                          {editId ? "CẬP NHẬT PHIẾU NÀY" : `LƯU PHIẾU ${type === "UNPOSTED" ? "HỦY MÓN" : "ĐÃ POST"}`}
                        </Button>
                      </div>

                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* CỘT PHẢI: LỊCH SỬ CÁC PHIẾU TRONG THÁNG */}
              <div className="lg:col-span-7 xl:col-span-7 flex flex-col h-full">
                <Card className="shadow-md border-0 ring-1 ring-slate-200 h-full flex flex-col bg-white overflow-hidden rounded-xl">
                  <div className="bg-slate-50/80 px-4 py-3 text-xs font-black text-slate-500 uppercase tracking-widest flex justify-between border-b border-slate-100 items-center">
                    <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-500"/> LỊCH SỬ NHẬP LIỆU THÁNG {selectedMonth}</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setSortOrder(s => s === "desc" ? "asc" : "desc")} className="h-7 text-[10px] bg-white">
                        <ArrowUpDown className="w-3 h-3 mr-1" />
                        {sortOrder === "desc" ? "Mới nhất trước" : "Cũ nhất trước"}
                      </Button>
                      <Badge variant="outline" className="bg-white border-slate-200 font-bold">{logs.length} PHIẾU</Badge>
                    </div>
                  </div>
                  
                  <div className="w-full overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50/90 backdrop-blur-md sticky top-0 z-10 shadow-xs">
                        <TableRow className="border-b-slate-200">
                          <TableHead className="w-[80px] p-3 text-[10px] font-bold uppercase text-slate-500">Ngày</TableHead>
                          <TableHead className="w-[90px] p-3 text-[10px] font-bold uppercase text-slate-500 text-center">Loại</TableHead>
                          <TableHead className="p-3 text-[10px] font-bold uppercase text-slate-500">Chi tiết Món</TableHead>
                          <TableHead className="text-right p-3 text-[10px] font-bold uppercase text-slate-500">Thành Tiền</TableHead>
                          <TableHead className="text-center w-[80px] p-3 text-[10px] font-bold uppercase text-slate-500">Sửa/Xóa</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedLogs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-20 text-slate-400 bg-slate-50/30">
                              <FileText className="w-8 h-8 opacity-20 mx-auto mb-3"/>
                              <span className="font-semibold text-sm">Chưa có phiếu nào trong tháng.</span>
                            </TableCell>
                          </TableRow>
                        ) : 
                          sortedLogs.map(log => {
                            const totalAmount = calculateBillTotal(log.items);
                            return (
                              <TableRow key={log._id} className={`hover:bg-slate-50 border-b-slate-100 transition-colors ${editId === log._id ? 'bg-amber-50/50' : ''}`}>
                                <TableCell className="p-3 text-[11px] font-bold text-slate-600">
                                  <div>{log.date.split('-')[2]}/{log.date.split('-')[1]}</div>
                                  {log.createdAt && (
                                    <div className="text-[9px] text-slate-400 font-normal mt-0.5 whitespace-nowrap">
                                      {new Date(log.createdAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="p-3 text-center">
                                  {log.type === "UNPOSTED" 
                                    ? <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-rose-200 shadow-none text-[9px] w-full justify-center">HỦY MÓN</Badge>
                                    : <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 shadow-none text-[9px] w-full justify-center">ĐÃ POST</Badge>
                                  }
                                </TableCell>
                                <TableCell className="p-3 text-[11px] text-slate-600 leading-relaxed max-w-[200px]">
                                  <div className="space-y-1">
                                    {log.items.map((it: any, idx: number) => (
                                      <div key={idx} className="flex items-start gap-1.5">
                                        <span className={`font-bold px-1.5 rounded text-[9px] ${log.type === "UNPOSTED" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>{it.quantity}</span>
                                        <span className="truncate">{it.name}</span>
                                      </div>
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell className="p-3 text-right font-bold text-slate-700">
                                  {formatVND(totalAmount)}
                                </TableCell>
                                <TableCell className="p-3 text-center">
                                  <div className="flex gap-1.5 justify-center">
                                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(log)} className="w-7 h-7 bg-blue-50 text-blue-600 hover:bg-blue-100 shadow-xs border border-blue-100"><Edit3 className="w-3.5 h-3.5"/></Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteLog(log._id)} className="w-7 h-7 bg-red-50 text-red-500 hover:bg-red-100 shadow-xs border border-red-100"><Trash2 className="w-3.5 h-3.5"/></Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          })
                        }
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* TAB THỐNG KÊ */}
          <TabsContent value="summary" className="m-0 pt-2">
            <Card className="shadow-xl border-0 ring-1 ring-slate-200 max-w-[1000px] mx-auto overflow-hidden rounded-2xl">
              <div className="p-5 bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                    <CheckSquare className="w-6 h-6 text-indigo-200" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg tracking-wider uppercase text-white drop-shadow-md">BÁO CÁO ĐỐI SOÁT HỦY/POST</h3>
                    <p className="text-[11px] text-indigo-200 font-medium uppercase tracking-widest mt-0.5 opacity-80">
                      Tháng {selectedMonth} (Chỉ hiện mặt hàng có số liệu)
                    </p>
                  </div>
                </div>
                <div className="md:text-right bg-black/20 p-3 rounded-xl border border-white/10 backdrop-blur-md">
                  <span className="text-[10px] block opacity-70 uppercase font-black tracking-widest text-indigo-200">TỔNG GIÁ TRỊ HỦY THỰC TẾ:</span>
                  <span className={`text-2xl font-black drop-shadow-lg tracking-tighter ${summaryData.totalLostValue >= 0 ? "text-amber-400" : "text-emerald-400"}`}>
                    {formatVND(summaryData.totalLostValue)}
                  </span>
                </div>
              </div>
              
              <div className="bg-white p-0">
                {Object.keys(summaryData.groups).length === 0 ? (
                  <div className="text-center py-24 text-slate-400 bg-slate-50/50">
                    <CheckSquare className="w-10 h-10 mx-auto mb-3 opacity-30 text-emerald-500"/>
                    <span className="font-bold">Tháng này chưa ghi nhận món hủy nào.</span>
                  </div>
                ) : (
                  Object.entries(summaryData.groups).map(([catName, items], gIdx) => (
                    <div key={gIdx} className="mb-4">
                      <div className="bg-slate-100/80 px-5 py-2 font-black text-xs text-indigo-800 uppercase tracking-widest border-y border-slate-200">
                        {catName}
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow className="border-b-slate-200">
                            <TableHead className="font-bold text-slate-500 uppercase text-[10px] py-3 pl-6 w-[280px]">Tên Món</TableHead>
                            <TableHead className="text-right font-bold text-slate-500 uppercase text-[10px] py-3">Đơn Giá</TableHead>
                            <TableHead className="text-center font-bold text-rose-600 uppercase text-[10px] py-3 bg-rose-50/30">Tổng Hủy</TableHead>
                            <TableHead className="text-center font-bold text-emerald-600 uppercase text-[10px] py-3 bg-emerald-50/30">Đã Post</TableHead>
                            <TableHead className="text-right font-bold text-slate-500 uppercase text-[10px] py-3 pr-6">Trạng Thái (Hủy - Post)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item, idx) => {
                            const remain = item.unpostedQty - item.postedQty;
                            return (
                              <TableRow key={idx} className="border-b border-slate-100 hover:bg-indigo-50/30">
                                <TableCell className="font-bold text-slate-700 text-xs pl-6 py-3">{item.name}</TableCell>
                                <TableCell className="text-right py-3 text-xs font-medium text-slate-500">{formatVND(item.price)}</TableCell>
                                <TableCell className="text-center py-3 font-black text-rose-600 text-sm bg-rose-50/10">{item.unpostedQty}</TableCell>
                                <TableCell className="text-center py-3 font-black text-emerald-600 text-sm bg-emerald-50/10">{item.postedQty}</TableCell>
                                <TableCell className="text-right py-3 pr-6">
                                  {remain > 0 ? (
                                    <span className="inline-flex items-center gap-1 text-rose-600 font-bold text-[11px] bg-rose-100 px-2 py-1 rounded">
                                      Thiếu {remain}
                                    </span>
                                  ) : remain < 0 ? (
                                    <span className="inline-flex items-center gap-1 text-amber-600 font-bold text-[11px] bg-amber-100 px-2 py-1 rounded">
                                      Dư {Math.abs(remain)}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[11px] bg-emerald-100 px-2 py-1 rounded">
                                      <CheckSquare className="w-3 h-3"/> Khớp
                                    </span>
                                  )}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </TabsContent>

          {/* TAB CHI TIẾT BILL */}
          <TabsContent value="bills" className="m-0 pt-2">
             <Card className="shadow-md border-0 ring-1 ring-slate-200 max-w-[1200px] mx-auto bg-white overflow-hidden rounded-xl">
               <div className="bg-emerald-50/80 px-5 py-4 text-xs font-black text-emerald-800 uppercase tracking-widest flex justify-between border-b border-emerald-100 items-center">
                  <span className="flex items-center gap-2"><Receipt className="w-5 h-5 text-emerald-600"/> DANH SÁCH BILL NHẬP LIỆU THÁNG {selectedMonth}</span>
                  <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setSortOrder(s => s === "desc" ? "asc" : "desc")} className="h-7 text-[10px] bg-white border-emerald-200 text-emerald-700">
                        <ArrowUpDown className="w-3 h-3 mr-1" />
                        {sortOrder === "desc" ? "Mới nhất trước" : "Cũ nhất trước"}
                      </Button>
                      <Badge className="bg-emerald-600 hover:bg-emerald-700 font-bold">{logs.length} BILL</Badge>
                  </div>
               </div>
               <div className="w-full overflow-x-auto">
                 <Table>
                    <TableHeader className="bg-emerald-50/30">
                       <TableRow className="border-b-emerald-100">
                         <TableHead className="w-[120px] p-4 text-[11px] font-bold uppercase text-emerald-700">Ngày / Giờ Tạo</TableHead>
                         <TableHead className="w-[120px] p-4 text-[11px] font-bold uppercase text-emerald-700 text-center">Phân Loại</TableHead>
                         <TableHead className="p-4 text-[11px] font-bold uppercase text-emerald-700 text-center">Tổng Số Món</TableHead>
                         <TableHead className="text-right p-4 text-[11px] font-bold uppercase text-emerald-700">Tổng Thành Tiền</TableHead>
                       </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedLogs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-20 text-slate-400 bg-slate-50/30">
                              <Receipt className="w-8 h-8 opacity-20 mx-auto mb-3"/>
                              <span className="font-semibold text-sm">Tháng này chưa có bill nào.</span>
                            </TableCell>
                          </TableRow>
                        ) :
                        sortedLogs.map(log => {
                          const billTotal = calculateBillTotal(log.items);
                          const billQty = calculateBillQty(log.items);

                          return (
                            <TableRow key={log._id} className="hover:bg-slate-50 border-b-slate-100">
                               <TableCell className="p-4 text-xs font-bold text-slate-700">
                                 <span>{log.date.split('-').reverse().join('/')}</span>
                                 {log.createdAt && (
                                   <span className="ml-2 text-[10px] text-slate-400 font-medium">
                                     {new Date(log.createdAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                                   </span>
                                 )}
                               </TableCell>
                               <TableCell className="p-4 text-center">
                                  {log.type === "UNPOSTED" 
                                    ? <Badge variant="outline" className="text-rose-600 border-rose-200 bg-rose-50 text-[10px]">HỦY MÓN</Badge>
                                    : <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 text-[10px]">ĐÃ POST</Badge>
                                  }
                               </TableCell>
                               <TableCell className="p-4 text-center font-bold text-slate-600">
                                  {billQty}
                               </TableCell>
                               <TableCell className="p-4 text-right font-black text-slate-800 text-sm">
                                  <span className={log.type === "UNPOSTED" ? "text-rose-600" : "text-emerald-600"}>
                                    {log.type === "POSTED" && "- "}
                                    {formatVND(billTotal)}
                                  </span>
                               </TableCell>
                            </TableRow>
                          )
                        })
                      }
                    </TableBody>
                 </Table>
               </div>
             </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}