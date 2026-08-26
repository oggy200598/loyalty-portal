import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../app/theme.dart';
import '../../core/widgets/loading_state.dart';
import '../../providers/product_provider.dart';
import '../../widgets/app_header.dart';
import '../../widgets/product_card.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  void initState() {
    super.initState();

    // Gọi API thật sau frame đầu tiên.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ProductProvider>().loadHomeData();
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ProductProvider>();

    return Scaffold(
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(60),
        child: SearchHeader(
          onSubmitted: (query) {
            if (query.trim().isNotEmpty) {
              context.go(
                '/search?q=${Uri.encodeComponent(query.trim())}',
              );
            }
          },
        ),
      ),

      body: provider.loadingProducts &&
              provider.products.isEmpty
          ? const LoadingState(
              message: 'Đang tải sản phẩm...',
            )
          : RefreshIndicator(
              color: AppColors.accent,
              onRefresh: () => provider.loadHomeData(),
              child: ListView(
                padding:
                    const EdgeInsets.only(bottom: 24),
                children: [
                  // Banner
                  Container(
                    margin: const EdgeInsets.all(12),
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppColors.accent,
                      borderRadius:
                          BorderRadius.circular(12),
                    ),
                    child: const Column(
                      crossAxisAlignment:
                          CrossAxisAlignment.start,
                      children: [
                        Text(
                          'RiskMind AI',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'Mua sắm thông minh cùng AI',
                          style: TextStyle(
                            color: Colors.white70,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Danh mục nổi bật
                  if (provider.categories.isNotEmpty) ...[
                    const SectionTitle(
                        title: 'Danh mục'),
                    SizedBox(
                      height: 96,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets
                            .symmetric(horizontal: 12),
                        itemCount: provider
                            .categories.length,
                        separatorBuilder: (_, __) =>
                            const SizedBox(width: 8),
                        itemBuilder: (context, index) {
                          final category = provider
                              .categories[index];

                          return InkWell(
                            onTap: () => context.push(
                              '/categories/${category.id}?name=${Uri.encodeComponent(category.name)}',
                            ),
                            borderRadius:
                                BorderRadius.circular(10),
                            child: Container(
                              width: 76,
                              padding:
                                  const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: AppColors.card,
                                borderRadius:
                                    BorderRadius.circular(
                                        10),
                                border: Border.all(
                                  color:
                                      AppColors.border,
                                ),
                              ),
                              child: Column(
                                mainAxisAlignment:
                                    MainAxisAlignment
                                        .center,
                                children: [
                                  const Icon(
                                    Icons.grid_view_rounded,
                                    color:
                                        AppColors.accent,
                                  ),
                                  const SizedBox(
                                      height: 6),
                                  Text(
                                    category.name,
                                    maxLines: 2,
                                    textAlign: TextAlign
                                        .center,
                                    overflow: TextOverflow
                                        .ellipsis,
                                    style:
                                        const TextStyle(
                                      fontSize: 11,
                                      color: AppColors
                                          .textPrimary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ],

                  // Sản phẩm đề xuất
                  if (provider.productError != null)
                    ErrorState(
                      message: provider.productError!,
                      onRetry: () => provider
                          .loadProducts(limit: 36),
                    )
                  else ...[
                    const SectionTitle(
                        title: 'Gợi ý hôm nay'),

                    GridView.builder(
                      shrinkWrap: true,
                      physics:
                          const NeverScrollableScrollPhysics(),
                      padding: const EdgeInsets
                          .symmetric(horizontal: 12),
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        mainAxisSpacing: 10,
                        crossAxisSpacing: 10,
                        childAspectRatio: 0.72,
                      ),
                      itemCount:
                          provider.products.length,
                      itemBuilder: (context, index) {
                        return ProductCard(
                          product: provider
                              .products[index],
                        );
                      },
                    ),
                  ],
                ],
              ),
            ),
    );
  }
}

class SectionTitle extends StatelessWidget {
  final String title;

  const SectionTitle({super.key, required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 18,
            decoration: BoxDecoration(
              color: AppColors.accent,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            title.toUpperCase(),
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}
