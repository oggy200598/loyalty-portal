import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../app/theme.dart';
import '../../core/widgets/loading_state.dart';
import '../../providers/product_provider.dart';

class CategoryScreen extends StatefulWidget {
  const CategoryScreen({super.key});

  @override
  State<CategoryScreen> createState() =>
      _CategoryScreenState();
}

class _CategoryScreenState
    extends State<CategoryScreen> {
  @override
  void initState() {
    super.initState();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final provider = context.read<ProductProvider>();
      if (provider.categories.isEmpty) {
        provider.loadCategories();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ProductProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Danh mục'),
      ),

      body: provider.loadingCategories &&
              provider.categories.isEmpty
          ? const LoadingState(
              message: 'Đang tải danh mục...',
            )
          : provider.categoryError != null
              ? ErrorState(
                  message: provider.categoryError!,
                  onRetry: () =>
                      provider.loadCategories(),
                )
              : GridView.builder(
                  padding: const EdgeInsets.all(12),
                  gridDelegate:
                      const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 3,
                    mainAxisSpacing: 10,
                    crossAxisSpacing: 10,
                    childAspectRatio: 0.9,
                  ),
                  itemCount:
                      provider.categories.length,
                  itemBuilder: (context, index) {
                    final category =
                        provider.categories[index];

                    return InkWell(
                      onTap: () => context.push(
                        '/categories/${category.id}',
                      ),
                      borderRadius:
                          BorderRadius.circular(10),
                      child: Card(
                        child: Column(
                          mainAxisAlignment:
                              MainAxisAlignment.center,
                          children: [
                            const Icon(
                              Icons
                                  .grid_view_rounded,
                              size: 32,
                              color:
                                  AppColors.accent,
                            ),
                            const SizedBox(
                                height: 8),
                            Padding(
                              padding: const EdgeInsets
                                  .symmetric(
                                horizontal: 6,
                              ),
                              child: Text(
                                category.name,
                                maxLines: 2,
                                textAlign:
                                    TextAlign.center,
                                overflow: TextOverflow
                                    .ellipsis,
                                style:
                                    const TextStyle(
                                  fontSize: 12,
                                  color: AppColors
                                      .textPrimary,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
