import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'screens/login_screen.dart';
import 'services/api_service.dart';

void main() async {
  try {
    WidgetsFlutterBinding.ensureInitialized();
    
    // Tenta sincronizar em background para não travar o app
    ApiService().sincronizarPontosPendentes().then((_) {
      print("Tentativa de sincronização concluída.");
    }).catchError((e) {
      print("Erro no sync de boot: $e");
    });

    List<CameraDescription> cameras = [];
    try {
      cameras = await availableCameras();
    } catch (e) {
      debugPrint("Erro ao buscar câmeras: $e");
    }
    
    runApp(MyApp(cameras: cameras));
  } catch (e) {
    runApp(MaterialApp(home: Scaffold(body: Center(child: Text("Erro fatal: $e")))));
  }
}

class MyApp extends StatelessWidget {
  final List<CameraDescription> cameras;
  const MyApp({Key? key, required this.cameras}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Sistema de Ponto',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(primarySwatch: Colors.blue),
      home: LoginScreen(cameras: cameras),
    );
  }
}
