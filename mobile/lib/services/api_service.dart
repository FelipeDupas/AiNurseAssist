import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'database_service.dart';

class ApiService {
  static const String baseUrl = 'http://192.168.68.110:3000'; 

  Future<bool> login(String cpf, String password) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'cpf': cpf, 'password': password}),
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('token', data['token']);
        return true;
      }
    } catch (e) {
      return false;
    }
    return false;
  }

  Future<Map<String, dynamic>> registrarPonto({
    required String imageBase64,
    required double latitude,
    required double longitude,
    required String deviceTime,
    bool isSync = false,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');

    try {
      final response = await http.post(
        Uri.parse('$baseUrl/registro-ponto'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'image_base64': imageBase64,
          'latitude': latitude,
          'longitude': longitude,
          'device_time': deviceTime,
        }),
      ).timeout(const Duration(seconds: 15));

      final result = jsonDecode(response.body);
      
      // Se o servidor retornar erro mas a conexão funcionou, não salvamos offline
      // (ex: erro de biometria)
      return result;
    } catch (e) {
      // Se der erro de conexão (timeout ou offline) e não for uma tentativa de sincronização
      if (!isSync) {
        final db = DatabaseService();
        await db.salvarPonto({
          'image_base64': imageBase64,
          'latitude': latitude,
          'longitude': longitude,
          'device_time': deviceTime,
        });
        return {
          'message': 'Offline', 
          'error': 'Sem internet. Ponto salvo localmente para sincronização futura.'
        };
      }
      // Se for durante a sincronização, apenas repassamos o erro para tentar depois
      rethrow;
    }
  }

  Future<void> sincronizarPontosPendentes() async {
    final db = DatabaseService();
    final pendentes = await db.buscarPendentes();

    if (pendentes.isEmpty) {
      print("ℹ️ Nenhum ponto pendente para sincronizar.");
      return;
    }

    print("🔄 Sincronizando ${pendentes.length} pontos...");

    for (var ponto in pendentes) {
      try {
        final res = await registrarPonto(
          imageBase64: ponto['image_base64'],
          latitude: ponto['latitude'],
          longitude: ponto['longitude'],
          deviceTime: ponto['device_time'],
          isSync: true, // Indica que não deve salvar no SQLite se falhar
        );

        // Se o servidor aceitou ou deu um erro que não seja de conexão (ex: biometria)
        // nós removemos do SQLite para não ficar tentando para sempre algo que o servidor rejeitou
        if (res['message'] != 'Offline') {
          await db.removerPonto(ponto['id']);
          print("✅ Ponto ${ponto['id']} sincronizado!");
        }
      } catch (e) {
        print("❌ Falha na conexão durante sincronização. Tentará novamente mais tarde.");
        break; // Para a sincronização se a internet cair no meio
      }
    }
  }
}
