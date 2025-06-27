// src/banner/banner.service.ts
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, ILike, LessThanOrEqual, MoreThanOrEqual, IsNull, Or } from 'typeorm';
import { Banner } from './entities/banner.entity';
import { CreateBannerZodDto, UpdateBannerZodDto, BannerQueryZodDto } from './dto/banner-zod.dto';
import { PaginatedResponse } from 'src/common/dto/pagination.dto';
import { MediaService } from 'src/modules/media/media.service'; // Đảm bảo đường dẫn đúng tới MediaService

@Injectable()
export class BannerService {
  private readonly logger = new Logger(BannerService.name);

  constructor(
    @InjectRepository(Banner)
    private readonly bannerRepository: Repository<Banner>,
    private readonly mediaService: MediaService, // Inject MediaService để kiểm tra media_id
  ) { }

  /**
   * Tạo một banner mới trong hệ thống.
   * Đảm bảo media_id được cung cấp phải tồn tại.
   *
   * @param createBannerDto Dữ liệu để tạo banner mới.
   * @returns Đối tượng Banner đã được tạo và lưu vào DB.
   * @throws BadRequestException nếu media_id không tồn tại hoặc có lỗi khi lưu DB.
   */
  async create(createBannerDto: CreateBannerZodDto): Promise<Banner> {
    this.logger.log(`Attempting to create new banner with media_id: ${createBannerDto.media_id}`);

    // Bước 1: Kiểm tra sự tồn tại của Media liên quan
    const mediaExists = await this.mediaService.checkMediaExists(createBannerDto.media_id);
    if (!mediaExists) {
      throw new BadRequestException(`Media with ID ${createBannerDto.media_id} does not exist. Cannot create banner.`);
    }

    // Bước 2: Tạo entity Banner từ DTO
    const newBanner = this.bannerRepository.create(createBannerDto);

    // Bước 3: Lưu banner vào cơ sở dữ liệu
    try {
      const savedBanner = await this.bannerRepository.save(newBanner);
      this.logger.log(`Successfully created banner with ID: ${savedBanner.id}`);
      return savedBanner;
    } catch (error) {
      this.logger.error(`Failed to create banner: ${error.message}`, error.stack);
      // Xử lý các lỗi DB cụ thể hơn nếu cần (ví dụ: lỗi duy nhất)
      throw new BadRequestException('Failed to create banner. Please check the provided data or try again later.');
    }
  }

  /**
   * Lấy danh sách tất cả các banner có hỗ trợ phân trang, tìm kiếm và lọc.
   *
   * @param queryParams Các tham số truy vấn bao gồm page, limit, search, sort, positionKey, bannerType, isActive.
   * @returns Đối tượng PaginatedResponse chứa danh sách banner và thông tin phân trang.
   */
  async findAll(queryParams: BannerQueryZodDto): Promise<PaginatedResponse<Banner>> {
    const { page = 1, limit = 10, search, sort, positionKey, bannerType, isActive } = queryParams;
    const skip = (page - 1) * limit;

    const findOptions: FindManyOptions<Banner> = {
      take: limit,
      skip: skip,
      relations: ['media'], // Tải quan hệ media để lấy thông tin ảnh đầy đủ
      order: {}, // Khởi tạo để tránh lỗi 'undefined'
    };

    // Xây dựng điều kiện WHERE dựa trên các tham số truy vấn
    const where: any = {};
    if (search) {
      // Tìm kiếm theo tiêu đề banner (case-insensitive)
      where.title = ILike(`%${search}%`);
    }
    if (positionKey) {
      where.position_key = positionKey;
    }
    if (bannerType) {
      where.banner_type = bannerType;
    }
    if (isActive !== undefined) { // Kiểm tra cả true và false
      where.is_active = isActive;
    }
    findOptions.where = where;

    // Xử lý sắp xếp động
    if (sort) {
      const [field, order] = sort.split(':');
      const allowedSortFields = ['id', 'title', 'display_order', 'starts_at', 'ends_at', 'created_at', 'updated_at'];

      if (field && allowedSortFields.includes(field)) {
        // Sử dụng non-null assertion (!) sau findOptions.order để báo cho TS biết rằng nó sẽ không undefined ở đây
        findOptions.order![field] = (order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC') as 'ASC' | 'DESC';
      } else {
        this.logger.warn(`Invalid sort parameter: "${sort}". Skipping sorting.`);
      }
    } else {
      // Sắp xếp mặc định:
      // Sử dụng non-null assertion (!)
      findOptions.order!['display_order'] = 'ASC';
      findOptions.order!['created_at'] = 'DESC';
    }

    // Thực hiện truy vấn và đếm tổng số mục
    const [banners, totalItems] = await this.bannerRepository.findAndCount(findOptions);

    // Tính toán thông tin phân trang
    const totalPages = Math.ceil(totalItems / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    // Gán full_url cho mỗi media trong banner để trả về cho client
    const bannersWithFullUrl = banners.map(banner => {
      if (banner.media) {
        // Sử dụng MediaService để lấy URL đầy đủ của file media
        // media.id là số, nên chúng ta cần phương thức chấp nhận ID trong MediaService
        (banner.media as any).full_url = this.mediaService.getMediaFullUrl(banner.media.id);
      }
      return banner;
    });

    return {
      data: bannersWithFullUrl,
      meta: {
        currentPage: page,
        itemCount: banners.length,
        itemsPerPage: limit,
        totalItems,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    };
  }

  /**
   * Lấy thông tin chi tiết của một banner theo ID.
   *
   * @param id ID của banner cần tìm.
   * @returns Đối tượng Banner tìm được.
   * @throws NotFoundException nếu không tìm thấy banner với ID đã cho.
   */
  async findOne(id: number): Promise<Banner> {
    this.logger.log(`Attempting to find banner with ID: ${id}`);
    const banner = await this.bannerRepository.findOne({
      where: { id },
      relations: ['media'], // Tải quan hệ media để lấy thông tin ảnh
    });

    if (!banner) {
      this.logger.warn(`Banner with ID ${id} not found.`);
      throw new NotFoundException(`Banner with ID ${id} not found.`);
    }

    // Gán full_url cho media của banner
    if (banner.media) {
      (banner.media as any).full_url = this.mediaService.getMediaFullUrl(banner.media.id);
    }

    this.logger.log(`Successfully found banner with ID: ${id}`);
    return banner;
  }

  /**
   * Cập nhật thông tin của một banner hiện có.
   *
   * @param id ID của banner cần cập nhật.
   * @param updateBannerDto Dữ liệu cập nhật.
   * @returns Đối tượng Banner đã được cập nhật.
   * @throws NotFoundException nếu không tìm thấy banner.
   * @throws BadRequestException nếu media_id mới không tồn tại hoặc có lỗi khi lưu DB.
   */
  async update(id: number, updateBannerDto: UpdateBannerZodDto): Promise<Banner> {
    this.logger.log(`Attempting to update banner ID: ${id} with data: ${JSON.stringify(updateBannerDto)}`);

    const banner = await this.bannerRepository.findOne({ where: { id } });
    if (!banner) {
      this.logger.warn(`Banner with ID ${id} not found for update.`);
      throw new NotFoundException(`Banner with ID ${id} not found.`);
    }

    // Kiểm tra sự tồn tại của media_id mới nếu được cung cấp trong DTO cập nhật
    if (updateBannerDto.media_id !== undefined && updateBannerDto.media_id !== null) {
      const mediaExists = await this.mediaService.checkMediaExists(updateBannerDto.media_id);
      if (!mediaExists) {
        throw new BadRequestException(`Media with ID ${updateBannerDto.media_id} does not exist. Cannot update banner.`);
      }
    }

    // Gộp dữ liệu mới vào entity hiện có
    this.bannerRepository.merge(banner, updateBannerDto);

    // Lưu các thay đổi vào cơ sở dữ liệu
    try {
      const updatedBanner = await this.bannerRepository.save(banner);
      this.logger.log(`Successfully updated banner with ID: ${id}`);
      return updatedBanner;
    } catch (error) {
      this.logger.error(`Failed to update banner ID ${id}: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to update banner. Please check the provided data or try again later.');
    }
  }

  /**
   * Xóa một banner khỏi hệ thống.
   *
   * @param id ID của banner cần xóa.
   * @returns void (không trả về gì nếu xóa thành công).
   * @throws NotFoundException nếu không tìm thấy banner để xóa.
   */
  async remove(id: number): Promise<void> {
    this.logger.log(`Attempting to remove banner with ID: ${id}`);
    const result = await this.bannerRepository.delete(id);

    if (result.affected === 0) {
      this.logger.warn(`Banner with ID ${id} not found for deletion.`);
      throw new NotFoundException(`Banner with ID ${id} not found.`);
    }
    this.logger.log(`Successfully removed banner with ID: ${id}`);
  }

  /**
   * Lấy danh sách các banner đang hoạt động theo vị trí hiển thị (cho public/frontend).
   * Các banner được lọc theo position_key, trạng thái active và khoảng thời gian hiệu lực.
   *
   * @param positionKey Khóa vị trí của banner (ví dụ: 'homepage_top', 'sidebar_ad').
   * @returns Mảng các đối tượng Banner đang hoạt động.
   */
  async getActiveBannersByPosition(positionKey: string): Promise<Banner[]> {
    this.logger.log(`Fetching active banners for position: "${positionKey}"`);
    const now = new Date(); // Lấy thời gian hiện tại để kiểm tra khoảng thời gian hiệu lực

    const banners = await this.bannerRepository.find({
      where: {
        position_key: positionKey, // Lọc theo vị trí
        is_active: true,           // Chỉ lấy banner đang hoạt động
        // starts_at phải là NULL HOẶC nhỏ hơn hoặc bằng thời gian hiện tại
        starts_at: Or(IsNull(), LessThanOrEqual(now)),
        // ends_at phải là NULL HOẶC lớn hơn hoặc bằng thời gian hiện tại
        ends_at: Or(IsNull(), MoreThanOrEqual(now)),
      },
      order: {
        display_order: 'ASC', // Sắp xếp theo thứ tự hiển thị
        created_at: 'DESC',   // Sau đó theo thời gian tạo mới nhất
      },
      relations: ['media'], // Tải thông tin media liên quan
    });

    // Gán full_url cho media của mỗi banner trước khi trả về
    return banners.map(banner => {
      if (banner.media) {
        (banner.media as any).full_url = this.mediaService.getMediaFullUrl(banner.media.id);
      }
      return banner;
    });
  }
}