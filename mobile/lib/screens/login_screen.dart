import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import '../services/api_service.dart';
import 'ponto_screen.dart';

class LoginScreen extends StatefulWidget {
  final List<CameraDescription> cameras;
  const LoginScreen({Key? key, required this.cameras}) : super(key: key);

  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController(text: 'admin@example.com');
  final _passwordController = TextEditingController(text: '123');
  final _apiService = ApiService();
  bool _isLoading = false;

  void _login() async {
    setState(() => _isLoading = true);
    final success = await _apiService.login(
      _emailController.text,
      _passwordController.text,
    );
    setState(() => _isLoading = false);

    if (success) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => const PontoScreen(),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Falha no login')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Login - Sistema de Ponto')),
      body: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          children: [
            TextField(controller: _emailController, decoration: const InputDecoration(labelText: 'Email')),
            TextField(controller: _passwordController, decoration: const InputDecoration(labelText: 'Senha'), obscureText: true),
            const SizedBox(height: 20),
            _isLoading 
              ? const CircularProgressIndicator() 
              : ElevatedButton(onPressed: _login, child: const Text('Entrar')),
          ],
        ),
      ),
    );
  }
}
