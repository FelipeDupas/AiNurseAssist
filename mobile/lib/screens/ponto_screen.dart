import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:intl/intl.dart';
import 'package:image_picker/image_picker.dart';
import '../services/api_service.dart';
import '../services/database_service.dart';

class PontoScreen extends StatefulWidget {
  const PontoScreen({Key? key}) : super(key: key);

  @override
  _PontoScreenState createState() => _PontoScreenState();
}

class _PontoScreenState extends State<PontoScreen> {
  final ApiService _apiService = ApiService();
  final DatabaseService _db = DatabaseService();
  final ImagePicker _picker = ImagePicker();
  bool _isProcessing = false;
  XFile? _imageFile;
  int _totalPendentes = 0;

  @override
  void initState() {
    super.initState();
    _atualizarEPontos();
  }

  Future<void> _atualizarEPontos() async {
    // Tenta sincronizar pontos pendentes assim que a tela abre
    await _apiService.sincronizarPontosPendentes();
    final total = await _db.contarPendentes();
    setState(() => _totalPendentes = total);
  }

  Future<void> _capturarEEnviar() async {
    setState(() => _isProcessing = true);

    try {
      // 1. Capturar Foto (abre o seletor ou câmera do sistema)
      final XFile? image = await _picker.pickImage(
        source: ImageSource.camera,
        maxWidth: 800, // Otimiza tamanho
        maxHeight: 800,
      );

      if (image == null) {
        setState(() => _isProcessing = false);
        return;
      }

      setState(() => _imageFile = image);

      // 2. Capturar Foto em Base64
      final bytes = await image.readAsBytes();
      final base64Image = base64Encode(bytes);

      // 3. Capturar GPS (Mockado caso o navegador bloqueie no desktop)
      double lat = 0.0;
      double lon = 0.0;
      try {
        LocationPermission permission = await Geolocator.checkPermission();
        if (permission == LocationPermission.denied) {
          permission = await Geolocator.requestPermission();
        }
        if (permission != LocationPermission.deniedForever) {
          final position = await Geolocator.getCurrentPosition(
            timeLimit: const Duration(seconds: 5),
          );
          lat = position.latitude;
          lon = position.longitude;
        }
      } catch (e) {
        debugPrint("Erro GPS: $e - Usando coordenadas zero.");
      }

      // 4. Horário
      final deviceTime = DateFormat("yyyy-MM-dd'T'HH:mm:ss").format(DateTime.now());

      // 5. Enviar para API
      final result = await _apiService.registrarPonto(
        imageBase64: base64Image,
        latitude: lat,
        longitude: lon,
        deviceTime: deviceTime,
      );

      _showDialog(
        result['message'] ?? 'Resultado',
        result['error'] ?? 'Ponto registrado com sucesso!',
      );
      
      // Atualiza o contador de pendentes caso o ponto tenha sido salvo offline
      final total = await _db.contarPendentes();
      setState(() => _totalPendentes = total);
      
    } catch (e) {
      _showDialog('Erro', e.toString());
    } finally {
      setState(() => _isProcessing = false);
    }
  }

  void _showDialog(String title, String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('OK')),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Registro de Ponto'),
        actions: [
          if (_totalPendentes > 0)
            IconButton(
              icon: const Icon(Icons.sync),
              onPressed: _isProcessing ? null : _atualizarEPontos,
              tooltip: 'Sincronizar agora',
            )
        ],
      ),
      body: Column(
        children: [
          if (_totalPendentes > 0)
            Container(
              color: Colors.orange.shade100,
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              child: Row(
                children: [
                  const Icon(Icons.cloud_off, color: Colors.orange),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      "Você tem $_totalPendentes ponto(s) aguardando conexão para sincronizar.",
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                  TextButton(
                    onPressed: _isProcessing ? null : _atualizarEPontos,
                    child: const Text("SINCRONIZAR"),
                  )
                ],
              ),
            ),
          Expanded(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    if (_imageFile != null)
                      const Icon(Icons.check_circle, color: Colors.green, size: 100)
                    else
                      const Icon(Icons.camera_alt, color: Colors.grey, size: 100),
                    const SizedBox(height: 20),
                    const Text(
                      "Clique no botão abaixo para tirar sua foto e registrar o ponto.",
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 16),
                    ),
                    const SizedBox(height: 40),
                    ElevatedButton.icon(
                      icon: const Icon(Icons.add_a_photo),
                      label: const Text('Tirar Foto e Bater Ponto'),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 30, vertical: 15),
                      ),
                      onPressed: _isProcessing ? null : _capturarEEnviar,
                    ),
                    if (_isProcessing)
                      const Padding(
                        padding: EdgeInsets.only(top: 20),
                        child: CircularProgressIndicator(),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
